import { useEffect, useRef } from "react";
import ProcGenLine from "./lib/proc-gen-line.ts";
import Vector2 from "./lib/vector2.ts";
import type { GridLayoutOptions, Rect } from "./lib/types.ts";

// Grid density (columns across the canvas).
const COLS = 24;
// Pixels the drawing head advances per frame.
const STEP_PX = 4;
// Clearance kept between the line and the title card.
const OBSTACLE_PADDING = 20;

const buildGrid = (
  { cols, rows, spacingX, spacingY }: GridLayoutOptions,
): Vector2[] => {
  const grid: Vector2[] = [];
  for (let x = 1; x < cols; x++) {
    for (let y = 1; y < rows; y++) {
      grid.push(new Vector2(Math.round(x * spacingX), Math.round(y * spacingY)));
    }
  }
  return grid;
};

const createGridPath = (grid: Vector2[]): Path2D => {
  const path = new Path2D();
  grid.forEach(({ x, y }) => {
    const dot = new Path2D();
    dot.arc(x, y, 2, 0, 2 * Math.PI);
    path.addPath(dot);
  });
  return path;
};

const createSegmentsPath = (segments: Vector2[]): Path2D => {
  const path = new Path2D();
  if (segments.length === 0) return path;
  path.moveTo(segments[0].x, segments[0].y);
  for (let i = 1; i < segments.length; i++) {
    path.lineTo(segments[i].x, segments[i].y);
  }
  return path;
};

function App() {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const lineCanvas = lineCanvasRef.current;
    if (!gridCanvas || !lineCanvas) return;
    const gridCtx = gridCanvas.getContext("2d");
    const lineCtx = lineCanvas.getContext("2d");
    if (!gridCtx || !lineCtx) return;

    // Back the canvases at device resolution but draw in CSS pixels, so canvas
    // coordinates line up with getBoundingClientRect() (used for the obstacle).
    const scale = window.devicePixelRatio || 1;
    const canvasRect = lineCanvas.getBoundingClientRect();
    const width = canvasRect.width;
    const height = canvasRect.height;
    const setupCanvas = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
    ) => {
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);
    };
    setupCanvas(gridCanvas, gridCtx);
    setupCanvas(lineCanvas, lineCtx);

    // Square cells: one spacing for both axes; rows follow from the height.
    const spacing = Math.max(1, Math.round(width / COLS));
    const rows = Math.max(2, Math.round(height / spacing));
    const gridLayoutOptions: GridLayoutOptions = {
      cols: COLS,
      rows,
      spacingX: spacing,
      spacingY: spacing,
      xMin: spacing,
      xMax: spacing * (COLS - 1),
      yMin: spacing,
      yMax: spacing * (rows - 1),
    };
    const { xMin, xMax, yMin, yMax } = gridLayoutOptions;

    const grid = buildGrid(gridLayoutOptions);

    // The dot grid is static, so draw it once. It's blurred via CSS on the
    // element, keeping the animated line (a separate canvas) crisp.
    gridCtx.fillStyle = "#78716c";
    gridCtx.fill(createGridPath(grid));

    // Non-corner perimeter points: valid places for a line to start.
    const edges = grid.filter((v) => {
      const onEdge = v.x === xMin || v.x === xMax || v.y === yMin || v.y === yMax;
      const isCorner =
        (v.x === xMin || v.x === xMax) && (v.y === yMin || v.y === yMax);
      return onEdge && !isCorner;
    });

    // The title card, measured in canvas-local coordinates.
    const obstacle = (): Rect | null => {
      const el = titleRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x - canvasRect.x,
        y: r.y - canvasRect.y,
        width: r.width,
        height: r.height,
      };
    };
    const obstacleRect = obstacle();

    // The inflated card boundary the line traces. Used to fire the shimmer.
    const boundary = obstacleRect && {
      left: obstacleRect.x - OBSTACLE_PADDING,
      right: obstacleRect.x + obstacleRect.width + OBSTACLE_PADDING,
      top: obstacleRect.y - OBSTACLE_PADDING,
      bottom: obstacleRect.y + obstacleRect.height + OBSTACLE_PADDING,
    };
    const onBoundary = (p: Vector2): boolean => {
      if (!boundary) return false;
      const tol = 1.5;
      const onVertical =
        (Math.abs(p.x - boundary.left) <= tol ||
          Math.abs(p.x - boundary.right) <= tol) &&
        p.y >= boundary.top - tol &&
        p.y <= boundary.bottom + tol;
      const onHorizontal =
        (Math.abs(p.y - boundary.top) <= tol ||
          Math.abs(p.y - boundary.bottom) <= tol) &&
        p.x >= boundary.left - tol &&
        p.x <= boundary.right + tol;
      return onVertical || onHorizontal;
    };

    const spawnLine = (): ProcGenLine => {
      const line = new ProcGenLine(gridLayoutOptions, edges);
      line.generate();
      if (obstacleRect) line.applyObstacle(obstacleRect, OBSTACLE_PADDING, true);
      return line;
    };

    let procGenLine = spawnLine();
    let currentPosition = procGenLine.next();
    let prevPosition = Vector2.copy(currentPosition);
    let animationFrameID = 0;
    let shimmering = false;

    lineCtx.lineWidth = 4;
    lineCtx.lineCap = "round";
    lineCtx.lineJoin = "round";
    lineCtx.strokeStyle = "tomato";

    const animate = (): void => {
      lineCtx.clearRect(0, 0, width, height);

      // Ease the head toward the current target vertex along its one axis.
      if (!Vector2.isEqual(prevPosition, currentPosition)) {
        const diff = Vector2.subtract(currentPosition, prevPosition);
        if (diff.x !== 0) {
          const step = Math.min(STEP_PX, Math.abs(diff.x)) * Math.sign(diff.x);
          prevPosition.x += step;
        } else {
          const step = Math.min(STEP_PX, Math.abs(diff.y)) * Math.sign(diff.y);
          prevPosition.y += step;
        }
      }

      const completed = procGenLine.segments.slice(0, procGenLine.currentIndex);
      const path = createSegmentsPath(completed);
      path.lineTo(prevPosition.x, prevPosition.y);
      lineCtx.stroke(path);

      // Shimmer the title while the head is tracing its perimeter.
      const nowShimmering = onBoundary(prevPosition);
      if (nowShimmering !== shimmering) {
        shimmering = nowShimmering;
        titleRef.current?.classList.toggle("is-shimmering", shimmering);
      }

      if (Vector2.isEqual(prevPosition, currentPosition)) {
        currentPosition = procGenLine.next();
      }

      // (0, 0) is the sentinel for "walk finished" — start a fresh line.
      if (currentPosition.x === 0 && currentPosition.y === 0) {
        procGenLine = spawnLine();
        currentPosition = procGenLine.next();
        prevPosition = Vector2.copy(currentPosition);
      }

      animationFrameID = requestAnimationFrame(animate);
    };

    animationFrameID = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameID);
  }, []);

  return (
    <main className="h-screen w-screen relative overflow-hidden bg-stone-200">
      <canvas
        ref={gridCanvasRef}
        className="h-full w-full absolute top-0 left-0 z-0 blur-[2px]"
      />
      <canvas
        ref={lineCanvasRef}
        className="h-full w-full absolute top-0 left-0 z-10 blur-[2px]"
      >
        Your browser does not support the HTML5 canvas element :-(
      </canvas>
      <section className="h-full w-full flex justify-center items-center relative z-20 pointer-events-none">
        <div ref={titleRef} className="title-card text-center">
          <h1 className="text-7xl font-bold">Ryan Price</h1>
          <h2 className="text-4xl">Full Stack Engineer &amp; Cool Guy</h2>
        </div>
      </section>
    </main>
  );
}

export default App;
