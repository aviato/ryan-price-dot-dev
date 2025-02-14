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
  ctx: CanvasRenderingContext2D;
  segments: Vector2[];
  gridLayoutOptions: GridLayoutOptions;
  startingPoints: Vector2[];
  state: ProcGenLineStates;
  currentIndex: number;

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
    this.segments = [this.generateStartPos()];
    this.state = ProcGenLineStates.START;
    this.currentIndex = -1;
  }

  generateStartPos(): Vector2 {
    const startingPoint = this.startingPoints[
      Math.floor(Math.random() * (this.startingPoints.length - 1))
    ];
    return startingPoint;
  }

  generate(): Vector2[] {
    while (this.state !== ProcGenLineStates.DONE) {
      this.addToTail();
    }
    console.log("GENERATION COMPLETE");
    console.log(`${this.segments.length} segments.`);
    console.log(this.segments);
    return this.segments;
  }

  next(): Vector2 {
    this.currentIndex += 1;
    const nextVector2: Vector2 = this.segments[this.currentIndex];
    if (nextVector2) {
      return new Vector2(nextVector2.x, nextVector2.y);
    }
    return new Vector2(0, 0);
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

  getRandomDirection(currentDirection: LineDirection): LineDirection {
    const excludedDirection = (() => {
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
    const lastPoint = this.segments.at(-1) as Vector2;
    const randomSpacingValueX = getRandomInt(1, 4) * spacingX;
    const randomSpacingValueY = getRandomInt(1, 4) * spacingY;
    const nextPoint: Vector2 = {
      x: 0,
      y: 0,
    };

    if (this.segments.length >= 2) {
      const secondToLastPoint = this.segments.at(-2) as Vector2; // yikes
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
        console.error("Invalid starting point for nextPoint");
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
}
