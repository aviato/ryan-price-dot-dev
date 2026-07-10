import Vector2 from "./vector2.ts";
import type { Rect } from "./types.ts";

const EPS = 1e-6;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function isInside(p: Vector2, box: Box): boolean {
  return (
    p.x > box.left + EPS &&
    p.x < box.right - EPS &&
    p.y > box.top + EPS &&
    p.y < box.bottom - EPS
  );
}

/**
 * For an axis-aligned segment A->B, return where it enters and exits the box's
 * open interior, in travel order. Returns null when the segment never passes
 * through the interior (misses it or only grazes an edge).
 */
function interiorCrossing(
  a: Vector2,
  b: Vector2,
  box: Box,
): { entry: Vector2; exit: Vector2 } | null {
  if (a.y === b.y) {
    const y = a.y;
    if (y <= box.top || y >= box.bottom) return null;
    const dir = Math.sign(b.x - a.x);
    if (dir === 0) return null;
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    const iLo = Math.max(lo, box.left);
    const iHi = Math.min(hi, box.right);
    if (iLo >= iHi) return null;
    const [entryX, exitX] = dir > 0 ? [iLo, iHi] : [iHi, iLo];
    return { entry: new Vector2(entryX, y), exit: new Vector2(exitX, y) };
  }

  if (a.x === b.x) {
    const x = a.x;
    if (x <= box.left || x >= box.right) return null;
    const dir = Math.sign(b.y - a.y);
    if (dir === 0) return null;
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    const iLo = Math.max(lo, box.top);
    const iHi = Math.min(hi, box.bottom);
    if (iLo >= iHi) return null;
    const [entryY, exitY] = dir > 0 ? [iLo, iHi] : [iHi, iLo];
    return { entry: new Vector2(x, entryY), exit: new Vector2(x, exitY) };
  }

  // Non-axis-aligned segments are not produced by the generator.
  return null;
}

/** Nearest point on the box boundary (used when a path dead-ends inside it). */
function projectToBoundary(p: Vector2, box: Box): Vector2 {
  const dl = Math.abs(p.x - box.left);
  const dr = Math.abs(box.right - p.x);
  const dt = Math.abs(p.y - box.top);
  const db = Math.abs(box.bottom - p.y);
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) return new Vector2(box.left, p.y);
  if (m === dr) return new Vector2(box.right, p.y);
  if (m === dt) return new Vector2(p.x, box.top);
  return new Vector2(p.x, box.bottom);
}

/** Position of a boundary point along the perimeter, measured clockwise from TL. */
function perimeterParam(p: Vector2, box: Box, w: number, h: number): number {
  if (Math.abs(p.y - box.top) < EPS) return p.x - box.left; // top edge L->R
  if (Math.abs(p.x - box.right) < EPS) return w + (p.y - box.top); // right T->B
  if (Math.abs(p.y - box.bottom) < EPS) return w + h + (box.right - p.x); // bottom R->L
  return 2 * w + h + (box.bottom - p.y); // left edge B->T
}

/**
 * Corner points to visit when walking the perimeter from `entry` to `exit`,
 * taking whichever direction is shorter. Endpoints are not included.
 */
function perimeterCorners(entry: Vector2, exit: Vector2, box: Box): Vector2[] {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const perimeter = 2 * (w + h);

  const corners = [
    { param: 0, point: new Vector2(box.left, box.top) },
    { param: w, point: new Vector2(box.right, box.top) },
    { param: w + h, point: new Vector2(box.right, box.bottom) },
    { param: 2 * w + h, point: new Vector2(box.left, box.bottom) },
  ];

  const from = perimeterParam(entry, box, w, h);
  const to = perimeterParam(exit, box, w, h);
  const cw = ((to - from) % perimeter + perimeter) % perimeter;
  const ccw = perimeter - cw;
  if (cw < EPS) return [];

  const clockwise = cw <= ccw;
  const arc = clockwise ? cw : ccw;

  return corners
    .map(({ param, point }) => {
      const delta = clockwise
        ? ((param - from) % perimeter + perimeter) % perimeter
        : ((from - param) % perimeter + perimeter) % perimeter;
      return { delta, point };
    })
    .filter(({ delta }) => delta > EPS && delta < arc - EPS)
    .sort((a, b) => a.delta - b.delta)
    .map(({ point }) => point);
}

/** The four corners in clockwise order, starting from the one just past `p`. */
function loopCorners(p: Vector2, box: Box): Vector2[] {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const perimeter = 2 * (w + h);
  const corners = [
    { param: 0, point: new Vector2(box.left, box.top) },
    { param: w, point: new Vector2(box.right, box.top) },
    { param: w + h, point: new Vector2(box.right, box.bottom) },
    { param: 2 * w + h, point: new Vector2(box.left, box.bottom) },
  ];
  const from = perimeterParam(p, box, w, h);
  return corners
    .map(({ param, point }) => ({
      delta: ((param - from) % perimeter + perimeter) % perimeter,
      point,
    }))
    .sort((a, b) => a.delta - b.delta)
    .map(({ point }) => point);
}

/**
 * Reroute a polyline so that any part entering `rect` (grown by `padding`)
 * instead traces along its perimeter, then rejoins the original path. Assumes
 * axis-aligned segments. The returned points have no consecutive duplicates.
 *
 * When `fullLoop` is true, an intrusion makes the line circle the entire card
 * once (all four corners) before exiting, for a more pronounced effect.
 */
export function routeAroundRect(
  points: Vector2[],
  rect: Rect,
  padding: number = 0,
  fullLoop: boolean = false,
): Vector2[] {
  if (points.length < 2) return points.map((p) => Vector2.copy(p));

  const box: Box = {
    left: rect.x - padding,
    right: rect.x + rect.width + padding,
    top: rect.y - padding,
    bottom: rect.y + rect.height + padding,
  };
  if (box.right <= box.left || box.bottom <= box.top) {
    return points.map((p) => Vector2.copy(p));
  }

  const out: Vector2[] = [];
  const push = (p: Vector2) => {
    const last = out[out.length - 1];
    if (!last || !Vector2.isEqual(last, p)) out.push(Vector2.copy(p));
  };

  push(points[0]);
  const guardMax = points.length * 8 + 64;
  let i = 0;
  let guard = 0;
  while (i < points.length - 1 && guard++ < guardMax) {
    const a = out[out.length - 1];
    const b = points[i + 1];
    const cross = interiorCrossing(a, b, box);
    if (!cross) {
      push(b);
      i++;
      continue;
    }

    push(cross.entry);

    // Follow the path forward until it leaves the box again.
    let segStart = cross.entry;
    let segEnd = b;
    let j = i + 1;
    let exit: Vector2 | null = null;
    let scan = 0;
    while (scan++ < guardMax) {
      if (!isInside(segEnd, box)) {
        const leaving = interiorCrossing(segStart, segEnd, box);
        exit = leaving ? leaving.exit : projectToBoundary(segStart, box);
        break;
      }
      j++;
      if (j >= points.length) {
        exit = projectToBoundary(segEnd, box);
        j = points.length - 1;
        break;
      }
      segStart = segEnd;
      segEnd = points[j];
    }
    if (!exit) break;

    if (fullLoop) {
      // A full lap around every corner, back to the entry point...
      for (const corner of loopCorners(cross.entry, box)) push(corner);
      push(cross.entry);
    }
    // ...then the short way out to the exit.
    for (const corner of perimeterCorners(cross.entry, exit, box)) push(corner);
    push(exit);
    i = j - 1;
  }

  return out;
}
