// Core geometry for the grid engine. Everything the line engine reasons about
// lives in *node* space — integer (c,r) coordinates on the dot lattice. Pixels
// are only computed at draw time via the grid geometry.

export interface Node {
  c: number;
  r: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Grid layout in pixels + nodes for the current viewport. */
export interface GridGeom {
  cols: number;
  rows: number;
  sp: number; // node spacing, px
  offX: number; // px margin to the first column
  offY: number; // px margin to the first row
  w: number; // viewport width, px
  h: number; // viewport height, px
}

/** A content frame, snapped to grid nodes. Pixel fields are derived. */
export interface FrameRect {
  col0: number;
  row0: number;
  cols: number; // width in nodes
  rows: number; // height in nodes
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Region = "A" | "B";

/** One planned line circuit: an ordered list of nodes the head walks. */
export interface Plan {
  nodes: Node[];
  /** Index range (into `nodes`) of the frame-border trace, for FX. */
  traceStart: number;
  traceEnd: number;
}
