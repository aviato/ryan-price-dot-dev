import isEmptyValue from "./utils/isEmptyValue.ts";

export default class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    if (isNaN(x) || isNaN(y)) {
      throw new Error("x and y arguments must be numbers");
    }
    this.x = x;
    this.y = y;
  }

  static add(a: Vector2, b: Vector2): Vector2 {
    if (isEmptyValue(a) || isEmptyValue(b)) {
      throw new Error("You must provide two valid Vector2s");
    }
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static subtract(a: Vector2, b: Vector2): Vector2 {
    if (isEmptyValue(a) || isEmptyValue(b)) {
      console.log({ a, b });
      throw new Error("You must provide two valid Vector2s");
    }
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static getDirection(a: Vector2, b: Vector2): Vector2 {
    if (isEmptyValue(a) || isEmptyValue(b)) {
      throw new Error("You must provide two valid Vector2s");
    }
    return new Vector2(b.x - a.x, b.y - a.y);
  }

  static isEqual(a: Vector2, b: Vector2): boolean {
    if (isEmptyValue(a) || isEmptyValue(b)) {
      throw new Error("You must provide two valid Vector2s");
    }
    return a.x === b.x && a.y === b.y;
  }
}
