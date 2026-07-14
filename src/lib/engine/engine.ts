import { DEFAULT_PARAMS, type Params, type Palette, THEMES } from "../config.ts";
import type { FrameRect, GridGeom, Plan, Pt, Region } from "../types.ts";
import { interiorNodes, key, nodeToPx } from "./grid.ts";
import { planLine } from "./planner.ts";
import {
  type AnchorSet,
  buildChoreography,
  choreoDuration,
  partialPolyline,
  type Stroke,
} from "./choreo.ts";

interface Line {
  plan: Plan;
  region: Region;
  reserved: string[];
  head: number; // float node-index progress
  tail: number;
  phase: "draw" | "undraw" | "wait";
  wait: number;
  lastCorner: number; // last integer index crossed (for corner pulses)
}

interface Ripple {
  x: number;
  y: number;
  t: number;
  life: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
}
interface Pulse {
  x: number;
  y: number;
  t: number;
}

export interface EngineHooks {
  /**
   * Return the section's *real* content box as a grid-snapped frame, measured
   * live from the DOM. This is the single source of truth for where content is,
   * so lines always route around it. Null if the section can't be measured.
   */
  frameProvider: (id: string) => FrameRect | null;
  /** Measured element rects for the section's entrance choreography. */
  anchors: (id: string) => AnchorSet | null;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default class GridEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private hooks: EngineHooks;
  private params: Params = { ...DEFAULT_PARAMS };
  private pal: Palette = THEMES.blueprint;

  private geom: GridGeom | null = null;
  private activeId: string | null = null;

  private occupied = new Set<string>();
  private lines: Line[] = [];
  private spawnGate = 0; // seconds until lines may (re)spawn after a section swap
  private scrolling = false; // lines are hidden while the page is in motion

  private ripples: Ripple[] = [];
  private particles: Particle[] = [];
  private pulses: Pulse[] = [];

  // Per-section entrance choreography (content-aware strokes).
  private choreo: Stroke[] = [];
  private choreoTime = 0;
  private choreoEnd = 0;

  private raf = 0;
  private last = 0;
  private reduced = false;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.hooks = hooks;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // --- public API -----------------------------------------------------------

  setParams(p: Params): void {
    const linesChanged = p.activeLines !== this.params.activeLines;
    this.pal = THEMES[p.theme];
    this.params = p;
    this.canvas.style.filter = p.backgroundBlur ? `blur(${p.backgroundBlur}px)` : "";
    if (this.reduced) {
      this.renderStatic();
    } else if (linesChanged && this.geom) {
      this.clearLines();
      this.trySpawn(true);
    }
  }

  /** Grid geometry changed (mount / resize / spacing). Re-measure on settle. */
  setGeom(geom: GridGeom): void {
    this.geom = geom;
    this.resizeCanvas(geom.w, geom.h);
    this.clearLines();
    if (this.reduced) this.renderStatic();
  }

  /** The page started moving: hide lines so they never draw against a frame
   * that is mid-scroll (and thus misaligned with content). */
  setScrolling(): void {
    if (this.scrolling) return;
    this.scrolling = true;
    this.clearLines();
    this.choreo = [];
  }

  /** The page settled on `id`. Play the section's entrance choreography on
   * arrival, and (re)start the ambient lines that keep wandering underneath. */
  settle(id: string): void {
    this.scrolling = false;
    if (this.reduced || !this.geom) {
      this.renderStatic();
      return;
    }
    const changed = id !== this.activeId;
    this.activeId = id;
    this.clearLines();
    this.choreo = [];
    if (changed) {
      this.playChoreo(id);
      this.spawnGate = 0.55; // ambient lines resume just after the entrance
    } else {
      this.trySpawn(true);
    }
  }

  replay(): void {
    if (!this.activeId || this.reduced) return;
    this.playChoreo(this.activeId);
  }

  private playChoreo(id: string): void {
    const a = this.hooks.anchors(id);
    if (!a) return;
    this.choreo = buildChoreography(id, a);
    this.choreoTime = 0;
    this.choreoEnd = choreoDuration(this.choreo);
  }

  start(): void {
    if (this.reduced) {
      this.renderStatic();
      return;
    }
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  // --- line lifecycle -------------------------------------------------------

  private clearLines(): void {
    for (const l of this.lines) for (const k of l.reserved) this.occupied.delete(k);
    this.lines = [];
  }

  private activeFrame(): FrameRect | null {
    return this.activeId ? this.hooks.frameProvider(this.activeId) : null;
  }

  private trySpawn(reset = false): void {
    if (!this.geom) return;
    const fr = this.activeFrame();
    if (!fr) return;
    const want = Math.max(1, Math.min(2, this.params.activeLines));
    if (reset) this.lines = [];
    const interior = interiorNodes(fr);
    const regions: Region[] = ["A", "B"];
    for (let i = this.lines.length; i < want; i++) {
      this.spawnOne(fr, regions[i % 2], interior);
    }
  }

  private spawnOne(fr: FrameRect, region: Region, interior: Set<string>): void {
    const plan = planLine(
      this.geom!,
      fr,
      region,
      this.occupied,
      interior,
      this.params.traceLength,
      Math.random,
    );
    if (!plan) return; // couldn't route; retried next tick via wait
    const reserved: string[] = [];
    for (const n of plan.nodes) {
      if (n.c < 0 || n.r < 0 || n.c >= this.geom!.cols || n.r >= this.geom!.rows) continue;
      reserved.push(key(n.c, n.r));
    }
    this.lines.push({
      plan,
      region,
      reserved,
      head: 0,
      tail: 0,
      phase: "draw",
      wait: 0,
      lastCorner: 0,
    });
  }

  private advanceLine(l: Line, dt: number): void {
    const g = this.geom!;
    const nps = (this.params.lineSpeed / g.sp) * (0.4 + this.params.motion / 100);
    const end = l.plan.nodes.length - 1;
    if (l.phase === "draw") {
      const prev = l.head;
      l.head = Math.min(end, l.head + nps * dt);
      if (this.params.cornerPulse) this.emitCorners(l, prev, l.head);
      if (l.head >= end) l.phase = "undraw";
    } else if (l.phase === "undraw") {
      l.tail = Math.min(end, l.tail + nps * this.params.undrawSpeed * dt);
      if (l.tail >= end) {
        for (const k of l.reserved) this.occupied.delete(k);
        l.phase = "wait";
        l.wait = 0.25 + Math.random() * 0.5;
      }
    } else {
      l.wait -= dt;
      if (l.wait <= 0) {
        const fr = this.activeFrame();
        const interior = fr ? interiorNodes(fr) : new Set<string>();
        if (fr) {
          const plan = planLine(g, fr, l.region, this.occupied, interior, this.params.traceLength, Math.random);
          if (plan) {
            l.plan = plan;
            l.reserved = plan.nodes
              .filter((n) => n.c >= 0 && n.r >= 0 && n.c < g.cols && n.r < g.rows)
              .map((n) => key(n.c, n.r));
            l.head = 0;
            l.tail = 0;
            l.lastCorner = 0;
            l.phase = "draw";
          } else {
            l.wait = 0.3;
          }
        }
      }
    }
  }

  private emitCorners(l: Line, prev: number, cur: number): void {
    const g = this.geom!;
    for (let i = Math.floor(prev) + 1; i <= Math.floor(cur); i++) {
      if (i <= 0 || i >= l.plan.nodes.length - 1) continue;
      const a = l.plan.nodes[i - 1];
      const b = l.plan.nodes[i];
      const c = l.plan.nodes[i + 1];
      const turned = (b.c - a.c) !== (c.c - b.c) || (b.r - a.r) !== (c.r - b.r);
      if (turned) {
        const p = nodeToPx(g, b.c, b.r);
        this.pulses.push({ x: p.x, y: p.y, t: 0 });
      }
    }
  }

  // --- entrance choreography ------------------------------------------------

  private advanceChoreo(dt: number): void {
    if (!this.choreo.length) return;
    this.choreoTime += dt;
    if (this.choreoTime > this.choreoEnd + 0.05) this.choreo = [];
  }

  // --- frame ----------------------------------------------------------------

  private frame(dt: number): void {
    if (!this.geom) return;
    // While the page is in motion, draw only the grid — no lines/seeker/FX are
    // run against a scrolling (misaligned) frame.
    if (this.scrolling) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.geom.w, this.geom.h);
      this.drawDots();
      return;
    }
    if (this.spawnGate > 0) {
      this.spawnGate -= dt;
      if (this.spawnGate <= 0) this.trySpawn(true);
    }
    for (const l of this.lines) this.advanceLine(l, dt);
    this.advanceChoreo(dt);
    this.updateFx(dt);
    this.draw();
  }

  private updateFx(dt: number): void {
    this.ripples = this.ripples.filter((r) => (r.t += dt) < r.life);
    this.particles = this.particles.filter((p) => {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      return p.t < p.life;
    });
    this.pulses = this.pulses.filter((p) => (p.t += dt) < 0.5);
  }

  // --- drawing --------------------------------------------------------------

  private draw(): void {
    const ctx = this.ctx;
    const g = this.geom!;
    ctx.clearRect(0, 0, g.w, g.h);
    this.drawDots();
    if (this.params.frameBorder === "always") this.drawFrames();
    for (const l of this.lines) this.drawLine(l);
    this.drawChoreo();
    this.drawFx();
  }

  private drawDots(): void {
    const ctx = this.ctx;
    const g = this.geom!;
    const rad = Math.max(1, g.sp / 34);
    ctx.fillStyle = this.pal.dot;
    ctx.globalAlpha = this.params.gridVisibility;
    for (let c = 0; c < g.cols; c++) {
      for (let r = 0; r < g.rows; r++) {
        const x = g.offX + c * g.sp;
        const y = g.offY + r * g.sp;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFrames(): void {
    const fr = this.activeFrame();
    if (!fr) return;
    const ctx = this.ctx;
    ctx.strokeStyle = this.pal.frame;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.strokeRect(fr.x, fr.y, fr.w, fr.h);
    ctx.globalAlpha = 1;
  }

  private linePoint(l: Line, idx: number): Pt {
    const g = this.geom!;
    const nodes = l.plan.nodes;
    const i = Math.max(0, Math.min(nodes.length - 1, Math.floor(idx)));
    const j = Math.min(nodes.length - 1, i + 1);
    const t = idx - i;
    const a = nodeToPx(g, nodes[i].c, nodes[i].r);
    const b = nodeToPx(g, nodes[j].c, nodes[j].r);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  private drawLine(l: Line): void {
    const ctx = this.ctx;
    // During the inter-cycle gap the line is fully retracted; head still parks
    // at the plan end, so drawing here would flash the whole path. Skip it.
    if (l.phase === "wait") return;
    const from = l.phase === "undraw" ? l.tail : 0;
    const to = l.phase === "undraw" ? l.plan.nodes.length - 1 : l.head;
    if (to - from < 0.01) return;

    const pts: Pt[] = [this.linePoint(l, from)];
    for (let i = Math.ceil(from); i <= Math.floor(to); i++)
      pts.push(this.linePoint(l, i));
    pts.push(this.linePoint(l, to));

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.pal.line;
    ctx.shadowColor = this.pal.accent;
    ctx.shadowBlur = 10 * this.params.lineGlow;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Comet head: a bright hot dot leading the stroke while drawing.
    if (l.phase === "draw") {
      const h = this.linePoint(l, l.head);
      const heat = this.params.cometHeat;
      ctx.fillStyle = this.mix(this.pal.line, "#ffffff", heat * 0.7);
      ctx.shadowColor = this.pal.accent;
      ctx.shadowBlur = 14 * this.params.lineGlow;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 3 + heat * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawFx(): void {
    const ctx = this.ctx;
    // ripples
    for (const rp of this.ripples) {
      const k = rp.t / rp.life;
      ctx.strokeStyle = this.rgba(this.pal.accent, (1 - k) * 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 8 + k * 120, 0, Math.PI * 2);
      ctx.stroke();
    }
    // particles
    for (const p of this.particles) {
      ctx.fillStyle = this.rgba(this.pal.accent, 1 - p.t / p.life);
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    // corner pulses
    for (const p of this.pulses) {
      const k = p.t / 0.5;
      ctx.strokeStyle = this.rgba(this.pal.accent, (1 - k) * 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + k * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Draw the active entrance choreography: each stroke draws in, holds, fades. */
  private drawChoreo(): void {
    if (!this.choreo.length) return;
    const ctx = this.ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const st of this.choreo) {
      const t = this.choreoTime - st.delay;
      if (t < 0) continue;
      let f = 1;
      let alpha = 1;
      if (t < st.draw) {
        f = st.draw <= 0 ? 1 : t / st.draw;
      } else {
        const ft = t - st.draw - st.hold;
        if (ft > 0) alpha = clamp01(1 - ft / st.fade);
      }
      if (alpha <= 0) continue;
      const pts = partialPolyline(st.pts, f);
      if (pts.length < 2) continue;
      ctx.strokeStyle = this.rgba(this.pal.accent, alpha);
      ctx.lineWidth = st.width;
      ctx.shadowColor = this.pal.accent;
      ctx.shadowBlur = 8 * this.params.lineGlow;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (st.head && f < 1) {
        const h = pts[pts.length - 1];
        ctx.fillStyle = this.mix(this.pal.accent, "#ffffff", 0.5);
        ctx.beginPath();
        ctx.arc(h.x, h.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderStatic(): void {
    if (!this.geom) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.geom.w, this.geom.h);
    this.drawDots();
    if (this.params.frameBorder !== "off") this.drawFrames();
  }

  // --- canvas sizing --------------------------------------------------------

  private resizeCanvas(w: number, h: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // --- color helpers --------------------------------------------------------

  private rgba(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp01(a)})`;
  }

  private mix(hexA: string, hexB: string, t: number): string {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const m = (sh: number) =>
      Math.round((((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t));
    return `rgb(${m(16)},${m(8)},${m(0)})`;
  }
}
