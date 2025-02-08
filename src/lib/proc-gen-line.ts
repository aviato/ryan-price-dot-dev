import isEmptyValue from "./utils/isEmptyValue.ts";
import getRandomInt from "./utils/getRandomInt.ts";
import Vector2 from "./vector2.ts";

type LineDirection = "up" | "down" | "left" | "right";
enum ProcGenLineStates {
  START = 1,
  GENERATING,
  DONE,
}
enum Directions {
  UP = 1,
  DOWN,
  LEFT,
  RIGHT,
}

export default class ProcGenLine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContextthis.stepByD;
  start: Vector2;
  progress: Vector2;
  segments: Vector2[];
  currentSegment: number;
  stepBy: number;
  gridLayoutOptions: GridLayoutOptions;
  lineStyles: {
    color: string;
    lineWidth: number;
  };
  startingPoints: Vector2[];
  procGenLineState: ProcGenLineStates;

  constructor(
    { canvas, ctx }: CanvasContext,
    gridLayoutOptions: GridLayoutOptions,
    startingPoints: Vector2[],
  ) {
    if (!canvas || !ctx) {
      throw new Error("Canvas and context must be provided.");
    }
    if (!gridLayoutOptions) {
      throw new Error("Grid layout options must be provided.");
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.startingPoints = startingPoints;
    this.gridLayoutOptions = gridLayoutOptions;
    this.start = this.generateStartPos();
    this.progress = new Vector2(this.start.x, this.start.y);
    this.segments = [this.start];
    this.nextSegmentIndex = 1;
    this.lineStyles = {
      color: "black",
      lineWidth: 1,
    };
    this.stepBy = 16; // the amount of pixels drawn per frame
    this.state = ProcGenLineStates.START;
  }

  generateStartPos(): Vector2 {
    return this.startingPoints[
      Math.floor(Math.random() * (this.startingPoints.length - 1))
    ];
  }

  generate(): Vector2[] {
    while (this.state !== ProcGenLineStates.DONE) {
      this.addToTail();
    }
    console.log("GENERATION COMPLETE");
    console.log(`${this.segments.length} segments.`);
    return this.segments;
  }

  getRandomSegmentLen(min = 1, max = 4): number {
    Math.floor(Math.random() * (max - min) + min);
  }

  getDirection(a: Vector2, b: Vector2): LineDirection {
    const difference: Vector2 = Vector2.getDirection(a, b);
    // NOTE: change this to return a Vector2 that represents a given UPLR direction
    // Ex: { x: 1, y: 0} -> Right, { x: -1, y: 0 } -> Left
    if (difference.x >= 1 && difference.y === 0) {
      return "right";
    } else if (difference.x < 0 && difference.y === 0) {
      return "left";
    } else if (difference.x === 0 && difference.y > 1) {
      return "down";
    } else {
      return "up";
    }
  }

  getRandomSegmentLength(): number {
    const { spacingX, spacingY } = this.gridLayoutOptions;
    const minSegmentLengthX = spacingX;
    const maxSegmentLengthX = minSegmentLengthX * 4; // 51, 204
    const minSegmentLengthY = spacingY;
    const maxSegmentLengthY = minSegmentLengthY * 4;
    return 0;
  }

  getRandomDirection(currentDirection: LineDirection): LineDirection {
    let excludedDirection = (() => {
      if (currentDirection === "left") {
        return "right";
      } else if (currentDirection === "right") {
        return "left";
      } else if (currentDirection === "up") {
        return "down";
      } else {
        return "up";
      }
    })();
    const directions: LineDirection[] = ["up", "down", "left", "right"];
    const filteredDirections = directions.filter((dir) =>
      dir !== excludedDirection
    );
    return filteredDirections[
      Math.floor(Math.random() * filteredDirections.length)
    ];
  }

  addToTail(): void {
    const { spacingX, spacingY, xMin, xMax, yMin, yMax } =
      this.gridLayoutOptions;
    const lastPoint = this.segments[this.segments.length - 1];
    const randomSpacingValueX = getRandomInt(1, 4) * spacingX;
    const randomSpacingValueY = getRandomInt(1, 4) * spacingY;
    const nextPoint: Vector2 = {
      x: 0,
      y: 0,
    };

    if (this.segments.length >= 2) {
      const secondToLastPoint = this.segments[this.segments.length - 2];
      const direction = this.getDirection(secondToLastPoint, lastPoint); // a, b, c -> c - b
      const randomDirection = this.getRandomDirection(direction);

      if (randomDirection === "left") {
        nextPoint.x = Math.max(xMin, lastPoint.x - randomSpacingValueX);
        nextPoint.y = lastPoint.y;
      } else if (randomDirection === "right") {
        nextPoint.x = Math.min(xMax, lastPoint.x + randomSpacingValueX);
        nextPoint.y = lastPoint.y;
      } else if (randomDirection === "up") {
        nextPoint.x = lastPoint.x;
        nextPoint.y = Math.max(yMin, lastPoint.y - randomSpacingValueY);
      } else if (randomDirection === "down") {
        nextPoint.x = lastPoint.x;
        nextPoint.y = Math.min(yMax, lastPoint.y + randomSpacingValueY);
      } else {
        console.error("Direction not recognized");
      }
    } else {
      const xMinOrigin = lastPoint.x === xMin;
      const xMaxOrigin = lastPoint.x === xMax;
      const yMinOrigin = lastPoint.y === yMin;
      const yMaxOrigin = lastPoint.y === yMax;

      if (xMinOrigin) {
        nextPoint.x = lastPoint.x + randomSpacingValueX;
        nextPoint.y = lastPoint.y;
      } else if (xMaxOrigin) {
        nextPoint.x = lastPoint.x - randomSpacingValueX;
        nextPoint.y = lastPoint.y;
      } else if (yMaxOrigin) {
        nextPoint.x = lastPoint.x;
        nextPoint.y = lastPoint.y - randomSpacingValueY;
      } else if (yMinOrigin) {
        nextPoint.x = lastPoint.x;
        nextPoint.y = lastPoint.y + randomSpacingValueY;
      } else {
        console.error("Now starting point matched L, R, U, or D");
      }
    }

    if (
      nextPoint.x === xMin || nextPoint.x === xMax || nextPoint.y === yMin ||
      nextPoint.y === yMax
    ) {
      this.state = ProcGenLineStates.DONE;
    }
    this.segments.push(nextPoint);
  }

  stepByDirection() {
    const currentSegment = this.currentSegment;
    const currentDirection = this.getDirection(
      this.segments[currentSegment - 1],
      this.segments[currentSegment],
    );

    if (currentDirection === "left" || currentDirection === "down") {
      return this.stepBy * -1;
    } else {
      return this.stepBy;
    }
  }

  draw(): void {
    const { xMin, xMax, yMin, yMax } = this.gridLayoutOptions;
    const currentSegment: Vector2 = this.segments[this.currentSegment];
    if (
      this.progress.x !== currentSegment.x &&
      this.progress.y === currentSegment.y
    ) {
      console.log("i am in the if");
      this.progress.x += this.stepByDirection();
    } else if (
      this.progress.y !== currentSegment.y &&
      this.progress.x === currentSegment.x
    ) {
      console.log("in the else if");
      this.progress.y += this.stepByDirection();
    } else {
      this.currentSegment += 1;
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(currentSegment.x, currentSegment.y);
    this.ctx.lineTo(this.progress.x, this.progress.y);
    this.ctx.stroke();
  }
}
