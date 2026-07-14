import type { Pt } from "../types.ts";

// Per-section entrance choreography: hand-authored strokes that attach to the
// section's *real* measured elements (heading, cards, chip labels, icon row),
// played on the canvas when a section settles into view. The ambient procedural
// lines keep running underneath; these are the deliberate "the grid greets the
// content" moments.

/** A measured element box in viewport px. */
export interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What App measures for a section; routines read whatever they need. */
export interface AnchorSet {
  frame: RectPx | null;
  heading?: RectPx | null;
  items?: RectPx[];
}

/** One timed stroke: a polyline that draws in, holds, then fades out. */
export interface Stroke {
  pts: Pt[];
  delay: number; // s before it starts
  draw: number; // s to draw in
  hold: number; // s fully drawn
  fade: number; // s to fade out
  width: number;
  head: boolean; // bright comet head while drawing
}

interface StrokeOpts {
  draw?: number;
  hold?: number;
  fade?: number;
  width?: number;
  head?: boolean;
}

const stroke = (delay: number, pts: Pt[], o: StrokeOpts = {}): Stroke => ({
  pts,
  delay,
  draw: o.draw ?? 0.42,
  hold: o.hold ?? 0.7,
  fade: o.fade ?? 0.55,
  width: o.width ?? 2,
  head: o.head ?? true,
});

/** An L-shaped corner bracket hugging one corner of a rect. */
function bracket(r: RectPx, corner: "tl" | "tr" | "bl" | "br", pad: number, len: number): Pt[] {
  const l = r.x - pad, rt = r.x + r.w + pad, t = r.y - pad, b = r.y + r.h + pad;
  switch (corner) {
    case "tl": return [{ x: l, y: t + len }, { x: l, y: t }, { x: l + len, y: t }];
    case "tr": return [{ x: rt - len, y: t }, { x: rt, y: t }, { x: rt, y: t + len }];
    case "bl": return [{ x: l, y: b - len }, { x: l, y: b }, { x: l + len, y: b }];
    case "br": return [{ x: rt - len, y: b }, { x: rt, y: b }, { x: rt, y: b - len }];
  }
}

export function buildChoreography(id: string, a: AnchorSet): Stroke[] {
  const s: Stroke[] = [];

  if (id === "index" && a.heading) {
    // Two opposite brackets sweep in and frame the name.
    s.push(stroke(0.0, bracket(a.heading, "tl", 12, 30), { draw: 0.5 }));
    s.push(stroke(0.14, bracket(a.heading, "br", 12, 30), { draw: 0.5 }));
  }

  if (id === "about" && a.heading) {
    const r = a.heading;
    const y = r.y + r.h + 10;
    s.push(stroke(0.0, [{ x: r.x - 4, y }, { x: r.x + r.w + 20, y }], { draw: 0.5 }));
    s.push(stroke(0.22, [{ x: r.x - 16, y: r.y - 4 }, { x: r.x - 16, y: y + 8 }], { head: false, draw: 0.35 }));
  }

  if (id === "experience" && a.items?.length) {
    // A timeline spine down the left of the roles, ticking out at each one.
    const items = a.items;
    const sx = items[0].x - 20;
    const top = items[0].y - 2;
    const bot = items[items.length - 1].y + Math.min(items[items.length - 1].h, 40);
    s.push(stroke(0.0, [{ x: sx, y: top }, { x: sx, y: bot }], { draw: 0.6, hold: 1.1 }));
    items.forEach((it, i) => {
      const y = it.y + 12;
      s.push(stroke(0.45 + i * 0.11, [{ x: sx, y }, { x: it.x - 6, y }], { draw: 0.2, hold: 0.8, head: false }));
    });
  }

  if (id === "projects" && a.items?.length) {
    // Corner brackets snap around each card in sequence.
    a.items.forEach((c, i) => {
      const base = 0.06 + i * 0.16;
      s.push(stroke(base, bracket(c, "tl", 9, 22)));
      s.push(stroke(base + 0.08, bracket(c, "br", 9, 22)));
    });
  }

  if (id === "skills" && a.items?.length) {
    // Underline sweeps beneath each group label in turn.
    a.items.forEach((r, i) => {
      const y = r.y + r.h + 6;
      s.push(stroke(i * 0.18, [{ x: r.x - 2, y }, { x: r.x + r.w + 12, y }], { draw: 0.35 }));
    });
  }

  if (id === "contact") {
    const row = a.items?.[0];
    if (row) {
      const y = row.y + row.h + 12;
      s.push(stroke(0.0, [{ x: row.x - 6, y }, { x: row.x + row.w + 6, y }], { draw: 0.45 }));
    }
    if (a.heading) {
      const h = a.heading;
      s.push(stroke(0.16, [{ x: h.x - 12, y: h.y - 6 }, { x: h.x - 12, y: h.y + h.h + 6 }], { head: false, draw: 0.35 }));
    }
  }

  return s;
}

/** Total run time of a choreography (so the engine can clear it when done). */
export function choreoDuration(strokes: Stroke[]): number {
  let end = 0;
  for (const s of strokes) end = Math.max(end, s.delay + s.draw + s.hold + s.fade);
  return end;
}

/** The visible prefix of a polyline at draw-fraction f (0..1), by arc length. */
export function partialPolyline(pts: Pt[], f: number): Pt[] {
  if (f >= 1 || pts.length < 2) return pts;
  if (f <= 0) return [pts[0]];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let target = total * f;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (target <= seg) {
      const t = seg === 0 ? 0 : target / seg;
      out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t });
      break;
    }
    out.push(pts[i]);
    target -= seg;
  }
  return out;
}
