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
    console.log({ edges });

    let lastTimeStamp = 0;
    let procGenLine = new ProcGenLine(canvasContext, gridLayoutOptions, edges);
    procGenLine.generate();
    let temp = new Vector2(procGenLine.start.x, procGenLine.start.y);
    let stepBy = 2;
    let diff = Vector2.subtract(
      procGenLine.segments[procGenLine.nextSegmentIndex],
      temp,
    );
    let wait = false;
    console.log({ diff });

    /**
     * generate a line
     * create a temp vector2 and feed it start data (first point: a)
     * set current segment to 1 (this happens in constructor)
     * draw from temp to b (this.segments[0], this.segments[1]) by a step value
     * draw and increment values of temp until temp.x and temp.y are equal to
     * b.x and b.y
     * if temp.x and temp.y === z.x and z.y (where z is the last segment)
     * be done
     * else
     * set current segment to current segment + 1
     */
    function animate(timestamp: number): void {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(canvasContext, grid);
      const deltaTime = timestamp - lastTimeStamp;

      if (deltaTime > 1000) {
        lastTimeStamp = timestamp;
      }

      if (deltaTime > 10000 && wait) {
        wait = false;
      }

      if (debug) {
        calculateFPS(timestamp);
      }

      // TODO: rename some of this stuff...
      let nextIndex = procGenLine.nextSegmentIndex;
      let prevSegment = procGenLine.segments[nextIndex - 1];
      let currentSegment = procGenLine.segments[nextIndex];
      let tempIndex = 0;

      if (nextIndex > procGenLine.segments.length) {
        procGenLine = new ProcGenLine(canvasContext, gridLayoutOptions, edges);
        procGenLine.generate();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        tempIndex = 0;
        temp = new Vector2(procGenLine.start.x, procGenLine.start.y);
        console.log({ nextIndex, prevSegment, currentSegment, tempIndex })
        diff = Vector2.subtract(
          procGenLine.segments[procGenLine.nextSegmentIndex],
          temp,
        );
      }

      if (temp.x === currentSegment.x && temp.y === currentSegment.y) {
        procGenLine.nextSegmentIndex += 1;
        temp = new Vector2(currentSegment.x, currentSegment.y);
        diff = Vector2.subtract(
          procGenLine.segments[procGenLine.nextSegmentIndex],
          temp,
        );
      } else {
        if (diff.x === 0) {
          if (diff.y < 0) {
            temp.y -= stepBy;
          } else {
            temp.y += stepBy;
          }
        } else {
          if (diff.x < 0) {
            temp.x -= stepBy;
          } else {
            temp.x += stepBy;
          }
        }
      }

      // draw the previously animated segments as solid lines
      while (tempIndex < procGenLine.nextSegmentIndex - 1) {
        let a = procGenLine.segments[tempIndex];
        let b = procGenLine.segments[tempIndex + 1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        tempIndex += 1;
      }
      ctx.beginPath();
      ctx.moveTo(prevSegment.x, prevSegment.y);
      ctx.lineTo(temp.x, temp.y);
      ctx.stroke();

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
