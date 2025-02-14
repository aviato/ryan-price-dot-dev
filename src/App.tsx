import React, { useEffect, useRef, useState } from "react";
import ProcGenLine from "./lib/proc-gen-line.ts";
import Vector2 from "./lib/vector2.ts";

// Constants
const cols = 24;

// Types
interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface GridLayoutOptions {
  cols: number;
  rows: number;
  spacingX: number;
  spacingY: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const buildGrid = (
  { cols, rows, spacingX, spacingY }: GridLayoutOptions,
): Vector2[] => {
  const grid = [];
  for (let x = 1; x < cols; x++) {
    for (let y = 1; y < rows; y++) {
      grid.push(
        new Vector2(
          Math.round(x * spacingX),
          Math.round(y * spacingY),
        ),
      );
    }
  }
  return grid;
};

const createGridPath = (
  grid: Vector2[],
): void => {
  const path = new Path2D();
  grid.forEach(({ x, y }, _i) => {
    const subPath = new Path2D();
    subPath.arc(x, y, 2, 0, 2 * Math.PI);
    path.addPath(subPath);
  });
  return path;
};

function createCompletedSegmentsPath(
  completed: Vector2[],
): Path2D {
  const path = new Path2D();
  if (completed.length === 1) {
    path.moveTo(completed[0].x, completed[0].y);
    return path;
  }
  let prev = 0;
  for (let current = 0; current < completed.length; current++) {
    if (current === 0) {
      continue;
    }
    const prevSegment = completed[prev];
    const currentSegment = completed[current];
    path.moveTo(prevSegment.x, prevSegment.y);
    path.lineTo(currentSegment.x, currentSegment.y);
    prev = current;
  }
  return path;
}

function App() {
  const renderRef = useRef(0);
  const canvasEleRef = useRef<HTMLCanvasElement>(null);
  const mainEleRef = useRef<HTMLMainElement>(null);
  const fpsRef = useRef({
    lastFrameTime: 0,
    frameCount: 0,
  });
  const [resized, setResized] = useState(false);
  const [fps, setFps] = useState(0);
  const [debug, setDebug] = useState(false);

  // TODO there is a bug right now where FPS count does not clear when reloading after a save
  function calculateFPS(timestamp: number): void {
    const deltaTime = timestamp - fpsRef.current.lastFrameTime;
    fpsRef.current.frameCount++;

    if (deltaTime > 1000) {
      const currentFps = fpsRef.current.frameCount / (deltaTime / 1000);
      fpsRef.current.frameCount = 0;
      fpsRef.current.lastFrameTime = timestamp;
      setFps(currentFps);
    }
  }

  useEffect(() => {
    const canvas = canvasEleRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const canvasContext = { canvas, ctx };
    const scale = window.devicePixelRatio || 1;
    const boundingRect = canvas.getBoundingClientRect();
    canvas.width = boundingRect.width * scale;
    canvas.height = boundingRect.height * scale;

    // Set up gridLayoutOptions values
    const spacingX = Math.round(canvas.width / cols);
    const spacingY = Math.round(canvas.height / cols);
    const rows = Math.round(canvas.height / spacingY);
    const xMin = spacingX;
    const xMax = spacingX * (cols - 1);
    const yMin = spacingY;
    const yMax = spacingY * (rows - 1);
    const gridLayoutOptions = {
      cols,
      rows,
      spacingX,
      spacingY,
      xMin,
      xMax,
      yMin,
      yMax,
    };

    ctx.scale(scale, scale);
    ctx.fillStyle = "#090909";
    const grid: Vector2[] = buildGrid(gridLayoutOptions);

    const gridPath = createGridPath(grid);
    const edges: Vector2[] = grid.filter(
      (v2: Vector2): boolean => {
        return !(
          v2.x === xMin && v2.y === yMin ||
          v2.x === xMin && v2.y === yMax ||
          v2.x === xMax && v2.y === yMin ||
          v2.x === xMax && v2.y === yMax
        ) && (
          v2.x === xMin ||
          v2.x === xMax ||
          v2.y === yMin ||
          v2.y === yMax
        );
      },
    );
    console.log({ grid, edges });
    let lastTimeStamp = 0;
    let procGenLine = new ProcGenLine(
      gridLayoutOptions,
      edges,
    );
    procGenLine.generate();
    let currentPosition = procGenLine.next();
    let prevPosition = Vector2.copy(currentPosition);
    const stepBy = 44;
    let animationFrameID = 0;
    const TARGET_FPS = 60;
    const FRAME_MIN_TIME = 1000 / TARGET_FPS * (TARGET_FPS / TARGET_FPS) -
      (1000 / TARGET_FPS) * 0.5;

    const animate = (timestamp: number): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      //const deltaTime = timestamp - lastTimeStamp;
      ctx.fill(gridPath);
      ctx.moveTo(spacingX, spacingY);

      lastTimeStamp = timestamp;

      if (debug) {
        calculateFPS(timestamp);
      }

      if (!Vector2.isEqual(prevPosition, currentPosition)) {
        const diff = Vector2.subtract(
          currentPosition,
          prevPosition,
        );
        if (diff.x === 0) {
          const stepByOrDiff = Math.min(stepBy, Math.abs(diff.y));
          if (diff.y < 0) {
            prevPosition.y -= stepByOrDiff;
          } else {
            prevPosition.y += stepByOrDiff;
          }
        } else {
          const stepByOrDiff = Math.min(stepBy, Math.abs(diff.x));
          if (diff.x < 0) {
            prevPosition.x -= stepByOrDiff;
          } else {
            prevPosition.x += stepByOrDiff;
          }
        }
      }

      const completedSegments = procGenLine.segments.slice(
        0,
        procGenLine.currentIndex,
      );
      const completedSegmentsPath = createCompletedSegmentsPath(
        completedSegments,
      );
      completedSegmentsPath.lineTo(prevPosition.x, prevPosition.y);
      ctx.stroke(completedSegmentsPath);

      if (Vector2.isEqual(prevPosition, currentPosition)) {
        prevPosition = new Vector2(currentPosition.x, currentPosition.y);
        currentPosition = procGenLine.next();
      }

      if (currentPosition.x === 0 && currentPosition.y === 0) {
        procGenLine = new ProcGenLine(
          gridLayoutOptions,
          edges,
        );
        procGenLine.generate();
        currentPosition = procGenLine.next();
        prevPosition = new Vector2(currentPosition.x, currentPosition.y);
      }

      animationFrameID = requestAnimationFrame(animate);
    };

    animate();

    return function () {
      cancelAnimationFrame(animationFrameID);
    };
  }, [canvasEleRef]);

  renderRef.current++;
  return (
    <main
      ref={mainEleRef}
      className="h-screen w-screen relative bg-stone-200"
    >
      <canvas
        id="bg-canvas"
        ref={canvasEleRef}
        className="h-full w-full absolute t-0 l-0 z-0"
      >
        Your browser does not support the HTML5 canvas element :-(
      </canvas>
    </main>
  );
}

export default App;
