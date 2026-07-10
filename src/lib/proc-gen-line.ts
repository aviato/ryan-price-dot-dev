import getRandomInt from "./utils/getRandomInt.ts";
import Vector2 from "./vector2.ts";
import { routeAroundRect } from "./obstacle.ts";
import type { GridLayoutOptions, Rect } from "./types.ts";

const DIRECTIONS = Object.freeze({
  left: new Vector2(-1, 0),
  right: new Vector2(1, 0),
  up: new Vector2(0, -1),
  down: new Vector2(0, 1),
});

const ALL_DIRECTIONS: readonly Vector2[] = Object.freeze(
  Object.values(DIRECTIONS),
);

const key = (p: Vector2): string => `${p.x},${p.y}`;

/**
 * Generates a procedural, axis-aligned line that starts on a grid edge and
 * random-walks across the grid. The walk is *self-avoiding* — it never steps
 * onto or crosses a grid point it has already used, so it never doubles back —
 * and it always terminates on one of the grid's edges. The walk is pre-computed
 * into `segments`; the animator in App then draws them vertex by vertex.
 */
export default class ProcGenLine {
  segments: Vector2[];
  gridLayoutOptions: GridLayoutOptions;
  startingPoints: Vector2[];
  currentIndex: number;
  minSegments: number;
  maxSegments: number;
  maxSegmentCells: number;
  private occupied: Set<string>;

  constructor(
    gridLayoutOptions: GridLayoutOptions,
    startingPoints: Vector2[],
    minSegments: number = 10,
    maxSegmentCells: number = 4,
  ) {
    if (!gridLayoutOptions) {
      throw new Error("Grid layout options must be provided.");
    }
    if (!startingPoints.length) {
      throw new Error("At least one starting point must be provided.");
    }
    this.gridLayoutOptions = gridLayoutOptions;
    this.startingPoints = startingPoints;
    this.minSegments = minSegments;
    this.maxSegments = 200;
    this.maxSegmentCells = maxSegmentCells;
    this.currentIndex = -1;
    const start = this.generateStartPos();
    this.segments = [start];
    this.occupied = new Set([key(start)]);
  }

  generateStartPos(): Vector2 {
    const startingPoint = this.startingPoints[
      Math.floor(Math.random() * this.startingPoints.length)
    ];
    return Vector2.copy(startingPoint);
  }

  /**
   * Random-walk (self-avoiding) until the line has wandered at least
   * `minSegments`, then run it out to a screen edge so it always terminates on
   * a side.
   */
  generate(): Vector2[] {
    let guard = 0;
    while (guard++ < this.maxSegments * 4) {
      const last = this.segments.at(-1) as Vector2;

      if (this.segments.length > this.minSegments) {
        if (!this.isOnEdge(last)) this.finishToEdge(last);
        break;
      }
      if (!this.stepOnce(last, this.directionsFrom())) {
        if (!this.isOnEdge(last)) this.finishToEdge(last);
        break;
      }
    }
    return this.segments;
  }

  /**
   * Replace the generated path with one that detours around `rect`, tracing its
   * perimeter instead of passing through it. Resets iteration.
   */
  applyObstacle(rect: Rect, padding: number = 0, fullLoop: boolean = false): void {
    this.segments = routeAroundRect(this.segments, rect, padding, fullLoop);
    this.currentIndex = -1;
  }

  next(): Vector2 {
    this.currentIndex += 1;
    const nextVector2 = this.segments[this.currentIndex];
    if (nextVector2) {
      return Vector2.copy(nextVector2);
    }
    return new Vector2(0, 0);
  }

  private directionOf(from: Vector2, to: Vector2): Vector2 {
    const diff = Vector2.subtract(to, from);
    return new Vector2(Math.sign(diff.x), Math.sign(diff.y));
  }

  private opposite(direction: Vector2): Vector2 {
    return new Vector2(-direction.x, -direction.y);
  }

  private spacingFor(direction: Vector2): number {
    return direction.x !== 0
      ? this.gridLayoutOptions.spacingX
      : this.gridLayoutOptions.spacingY;
  }

  private isOnEdge(p: Vector2): boolean {
    const { xMin, xMax, yMin, yMax } = this.gridLayoutOptions;
    return p.x === xMin || p.x === xMax || p.y === yMin || p.y === yMax;
  }

  /** From a perimeter starting point, the only sensible first move is inward. */
  private firstDirection(start: Vector2): Vector2 {
    const { xMin, xMax, yMin } = this.gridLayoutOptions;
    if (start.x === xMin) return DIRECTIONS.right;
    if (start.x === xMax) return DIRECTIONS.left;
    if (start.y === yMin) return DIRECTIONS.down;
    return DIRECTIONS.up;
  }

  /** Candidate directions for the next step, minus an immediate reversal. */
  private directionsFrom(): Vector2[] {
    const last = this.segments.at(-1) as Vector2;
    if (this.segments.length === 1) return [this.firstDirection(last)];
    const prev = this.segments.at(-2) as Vector2;
    const reverse = this.opposite(this.directionOf(prev, last));
    return this.shuffle(ALL_DIRECTIONS.filter((d) => !Vector2.isEqual(d, reverse)));
  }

  private shuffle(items: Vector2[]): Vector2[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = getRandomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private cellsToBoundary(from: Vector2, direction: Vector2): number {
    const { xMin, xMax, yMin, yMax } = this.gridLayoutOptions;
    const spacing = this.spacingFor(direction);
    if (direction.x > 0) return Math.round((xMax - from.x) / spacing);
    if (direction.x < 0) return Math.round((from.x - xMin) / spacing);
    if (direction.y > 0) return Math.round((yMax - from.y) / spacing);
    return Math.round((from.y - yMin) / spacing);
  }

  /** How many cells the line can travel in `direction` before it would leave
   * the grid or hit its own path (capped at `maxCells`). */
  private freeRun(from: Vector2, direction: Vector2, maxCells: number): number {
    const spacing = this.spacingFor(direction);
    let count = 0;
    for (let i = 1; i <= maxCells; i++) {
      const p = new Vector2(
        from.x + direction.x * spacing * i,
        from.y + direction.y * spacing * i,
      );
      if (!this.inBounds(p) || this.occupied.has(key(p))) break;
      count = i;
    }
    return count;
  }

  private inBounds(p: Vector2): boolean {
    const { xMin, xMax, yMin, yMax } = this.gridLayoutOptions;
    return p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax;
  }

  /**
   * Try one self-avoiding step. Only accepts a move that keeps the head able to
   * reach a screen edge, so the walk can never trap itself in a closed pocket.
   * Returns false if no such move exists.
   */
  private stepOnce(from: Vector2, directions: Vector2[]): boolean {
    for (const direction of directions) {
      const run = this.freeRun(from, direction, this.maxSegmentCells);
      if (run < 1) continue;
      const start = getRandomInt(1, run);
      // Prefer the random length, then fall back to other lengths in this
      // direction, taking the first that doesn't seal the head off.
      for (let k = 0; k < run; k++) {
        const cells = ((start - 1 + k) % run) + 1;
        if (!this.wouldTrap(from, direction, cells)) {
          this.extend(from, direction, cells);
          return true;
        }
      }
    }
    return false;
  }

  /** Would ending a `cells`-long move here leave the head unable to reach a free
   * edge (and not already on one)? */
  private wouldTrap(from: Vector2, direction: Vector2, cells: number): boolean {
    const spacing = this.spacingFor(direction);
    const covered: string[] = [];
    let end = from;
    for (let i = 1; i <= cells; i++) {
      end = new Vector2(
        from.x + direction.x * spacing * i,
        from.y + direction.y * spacing * i,
      );
      covered.push(key(end));
    }
    for (const k of covered) this.occupied.add(k);
    const escapes = this.isOnEdge(end) || this.pathToEdge(end).length > 0;
    for (const k of covered) this.occupied.delete(k);
    return !escapes;
  }

  /**
   * Run the line out to a screen edge. Prefers a dramatic straight dart when one
   * is unobstructed; otherwise finds the shortest self-avoiding path to the
   * nearest edge so the line still terminates on a side.
   */
  private finishToEdge(from: Vector2): void {
    const darts = this.directionsFrom().filter((d) => {
      const toEdge = this.cellsToBoundary(from, d);
      return toEdge >= 1 && this.freeRun(from, d, toEdge) === toEdge;
    });
    if (darts.length) {
      const d = darts[getRandomInt(0, darts.length - 1)];
      this.extend(from, d, this.cellsToBoundary(from, d));
      return;
    }

    for (const p of this.pathToEdge(from)) {
      this.occupied.add(key(p));
      this.segments.push(p);
    }
  }

  /** Breadth-first search for the shortest run of free cells from `from` to any
   * edge. Returns the cells after `from` (empty if fully enclosed). */
  private pathToEdge(from: Vector2): Vector2[] {
    const visited = new Set([key(from)]);
    const parent = new Map<string, Vector2 | null>([[key(from), null]]);
    const queue: Vector2[] = [from];
    let goal: Vector2 | null = null;

    while (queue.length) {
      const cur = queue.shift() as Vector2;
      if (!Vector2.isEqual(cur, from) && this.isOnEdge(cur)) {
        goal = cur;
        break;
      }
      for (const d of ALL_DIRECTIONS) {
        const n = new Vector2(
          cur.x + d.x * this.spacingFor(d),
          cur.y + d.y * this.spacingFor(d),
        );
        const k = key(n);
        if (visited.has(k) || !this.inBounds(n) || this.occupied.has(k)) continue;
        visited.add(k);
        parent.set(k, cur);
        queue.push(n);
      }
    }

    const path: Vector2[] = [];
    let node = goal;
    while (node && !Vector2.isEqual(node, from)) {
      path.push(node);
      node = parent.get(key(node)) ?? null;
    }
    return path.reverse();
  }

  /** Append a straight segment of `cells` cells, marking every point it covers. */
  private extend(from: Vector2, direction: Vector2, cells: number): Vector2 {
    const spacing = this.spacingFor(direction);
    let end = from;
    for (let i = 1; i <= cells; i++) {
      end = new Vector2(
        from.x + direction.x * spacing * i,
        from.y + direction.y * spacing * i,
      );
      this.occupied.add(key(end));
    }
    this.segments.push(end);
    return end;
  }
}
