import type { FrameRect, GridGeom, Node, Pt } from "../types.ts";

export const key = (c: number, r: number): string => `${c},${r}`;
export const nodeKey = (n: Node): string => key(n.c, n.r);

/** Build the centered dot lattice for the current viewport + spacing. */
export function computeGeom(w: number, h: number, sp: number): GridGeom {
  const cols = Math.max(6, Math.floor(w / sp));
  const rows = Math.max(6, Math.floor(h / sp));
  const offX = (w - (cols - 1) * sp) / 2;
  const offY = (h - (rows - 1) * sp) / 2;
  return { cols, rows, sp, offX, offY, w, h };
}

export function nodeToPx(g: GridGeom, c: number, r: number): Pt {
  return { x: g.offX + c * g.sp, y: g.offY + r * g.sp };
}

/** Frame width/column placement — independent of content height, so it can be
 * applied to the DOM before measuring (text wrap depends on the width). */
export function frameBox(g: GridGeom, fraction: number): {
  col0: number;
  cols: number;
  x: number;
  w: number;
} {
  // Always leave a >=GUT-node gutter to each screen edge so the frame never
  // sits flush against an edge — that gutter is the lines' routing band, and it
  // guarantees the obstacle can enclose the content (no lines under content).
  const GUT = 2;
  const maxW = Math.max(4, g.cols - 2 * GUT);
  const fwNodes = clampInt(Math.round(fraction * g.cols), Math.min(6, maxW), maxW);
  const col0 = clampInt(Math.round((g.cols - fwNodes) / 2), GUT, g.cols - GUT - fwNodes);
  return { col0, cols: fwNodes, x: nodeToPx(g, col0, 0).x, w: fwNodes * g.sp };
}

/**
 * Content-fit frame, snapped to grid nodes and centered on the lattice.
 * Width = a fraction of columns; height measured from rendered content.
 */
export function computeFrame(
  g: GridGeom,
  contentH: number,
  fraction: number,
): FrameRect {
  const box = frameBox(g, fraction);
  const fhNodes = clampInt(Math.ceil(contentH / g.sp) + 1, 5, g.rows - 2);
  const row0 = clampInt(Math.round((g.rows - fhNodes) / 2), 1, g.rows - 1 - fhNodes);
  const p = nodeToPx(g, box.col0, row0);
  return {
    col0: box.col0,
    row0,
    cols: box.cols,
    rows: fhNodes,
    x: box.x,
    y: p.y,
    w: box.w,
    h: fhNodes * g.sp,
  };
}

/**
 * Snap a measured viewport-space rect (a section's real content box) *outward*
 * to enclosing grid nodes, clamped inside the lattice. Because it fully encloses
 * the content, the planner's interior-avoidance guarantees lines route around
 * the content — never through it.
 */
export function snapRectToFrame(g: GridGeom, rect: {
  left: number;
  top: number;
  right: number;
  bottom: number;
}): FrameRect | null {
  // Keep a >=1-node routing band between every frame side and the screen edge,
  // so both regions can always enter/route/peel-off — including on tall frames
  // whose content would otherwise clamp flush to an edge (killing Region B).
  const c0 = clampInt(Math.floor((rect.left - g.offX) / g.sp), 1, g.cols - 4);
  const c1 = clampInt(Math.ceil((rect.right - g.offX) / g.sp), c0 + 2, g.cols - 2);
  const r0 = clampInt(Math.floor((rect.top - g.offY) / g.sp), 1, g.rows - 4);
  const r1 = clampInt(Math.ceil((rect.bottom - g.offY) / g.sp), r0 + 2, g.rows - 2);
  const cols = c1 - c0;
  const rows = r1 - r0;
  if (cols < 2 || rows < 2) return null;
  const p = nodeToPx(g, c0, r0);
  return { col0: c0, row0: r0, cols, rows, x: p.x, y: p.y, w: cols * g.sp, h: rows * g.sp };
}

/** The set of interior nodes a line may never enter (frame interior). */
export function interiorNodes(fr: FrameRect): Set<string> {
  const s = new Set<string>();
  for (let c = fr.col0 + 1; c < fr.col0 + fr.cols; c++) {
    for (let r = fr.row0 + 1; r < fr.row0 + fr.rows; r++) {
      s.add(key(c, r));
    }
  }
  return s;
}

function clampInt(v: number, lo: number, hi: number): number {
  if (hi < lo) return lo;
  return Math.max(lo, Math.min(hi, v));
}
