import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import ProcGenLine from "./lib/proc-gen-line.ts";
import Vector2 from "./lib/vector2.ts";

// Constants
const numColumns = 24;

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
  const [debug, setDebug] = useState(true);

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

  const buildGrid = (
    { cols, rows, spacingX, spacingY }: GridLayoutOptions,
  ): Vector2[] => {
    const grid = [];
    for (let x = 1; x < cols; x++) {
      for (let y = 1; y < rows; y++) {
        grid.push(
          new Vector2(Math.floor(x * spacingX), Math.floor(y * spacingY)),
        );
      }
    }
    console.log({ grid });
    return grid;
  };

  const drawGrid = (
    { canvas, ctx }: CanvasContext,
    grid: Vector2[],
  ): void => {
    grid.forEach(({ x, y }, i) => {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      if (debug) {
        //ctx.fillText(`${i}`, x - 5, y - 5);
        ctx.fillText(`${x}, ${y}`, x - 15, y - 5);
      }
      ctx.fill();
    });
  };

  // TODO
  /**useEffect(() => {
    const handleResize = () => {
      setResized(true);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []) */

  useEffect(() => {
    const canvas = canvasEleRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const canvasContext = { canvas, ctx };
    const boundingRect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.width = boundingRect.width * scale;
    canvas.height = boundingRect.height * scale;

    // Set up gridLayoutOptions values
    const spacingX = Math.floor(canvas.width / numColumns);
    const rows = Math.floor(canvas.height / spacingX);
    const spacingY = Math.floor(canvas.height / rows);
    const xMin = spacingX;
    const xMax = spacingX * (numColumns - 1);
    const yMin = spacingY;
    const yMax = spacingY * (rows - 1);
    const gridLayoutOptions = {
      cols: numColumns,
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

    const grid = buildGrid(gridLayoutOptions);
    const edges = grid.filter((v2: Vector2): Vector2[] => {
      if (
        (v2.x === xMin && v2.y === yMin) ||
        (v2.x === xMin && v2.y === yMax) || (v2.x === xMax && v2.y === yMin) ||
        (v2.x === xMax && v2.y === yMax)
      ) {
        return;
      }

      return v2.x === spacingX ||
        v2.x === spacingX * (numColumns - 1) ||
        v2.y === spacingY || v2.y === spacingY * (rows - 1);
    });
    let lastTimeStamp = 0;
    let procGenLine = new ProcGenLine(canvasContext, gridLayoutOptions, edges);
    procGenLine.generate();
    let currentPosition = procGenLine.next();
    let prevPosition = currentPosition;
    let stepBy = .1;
    let calls = 0;

    function drawCompletedSegments(completed: Vector2[]) {
      let prev = 0;
      for (let current = 0; current < completed.length; current++) {
        if (current === 0) {
          continue;
        }
        const prevSegment = completed[prev];
        const currentSegment = completed[current];
        ctx.beginPath();
        ctx.moveTo(prevSegment.x, prevSegment.y);
        ctx.lineTo(currentSegment.x, currentSegment.y);
        ctx.stroke();
        prev = current;
      }
    }

    function drawNextSegment(start: Vector2, end: Vector2) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    const TARGET_FPS = 60;
    const FRAME_MIN_TIME = 1000 / TARGET_FPS * (TARGET_FPS / TARGET_FPS) -
      (1000 / TARGET_FPS) * 0.5;

    function animate(timestamp: number): void {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(canvasContext, grid);
      const deltaTime = timestamp - lastTimeStamp;

      if (deltaTime < FRAME_MIN_TIME) {
        requestAnimationFrame(animate);
        return;
      }

      lastTimeStamp = timestamp;

      if (debug) {
        calculateFPS(timestamp);
      }

      if (prevPosition !== currentPosition) {
        const diff = Vector2.subtract(
          currentPosition,
          prevPosition,
        );

        if (diff.x === 0) {
          if (diff.y < 0) {
            currentPosition.y -= stepBy;
          } else {
            currentPosition.y += stepBy;
          }
        } else {
          if (diff.x < 0) {
            currentPosition.x -= stepBy;
          } else {
            currentPosition.x += stepBy;
          }
        }
        drawNextSegment(prevPosition, currentPosition);
      }

      drawCompletedSegments(
        procGenLine.segments.slice(0, procGenLine.currentIndex),
      );

      prevPosition = currentPosition;
      currentPosition = procGenLine.next();

      if (currentPosition.x === 0 && currentPosition.y === 0) {
        procGenLine = new ProcGenLine(canvasContext, gridLayoutOptions, edges);
        procGenLine.generate();
        currentPosition = procGenLine.next();
      }

      requestAnimationFrame(animate);
    }

    animate();
  }, [canvasEleRef]);

  renderRef.current++;
  return (
    <main ref={mainEleRef} className="h-screen w-screen relative bg-stone-200">
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
