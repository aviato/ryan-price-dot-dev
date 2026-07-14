import type { FrameRect, GridGeom, Node, Plan, Region } from "../types.ts";
import { key } from "./grid.ts";

// Deterministic PRE-PLAN + RESERVE line planner (handoff §4). A line's entire
// circuit is planned and every cell reserved *before* it draws, so playback is
// pure and no dead-ends are possible. Region A owns the frame TOP+LEFT sides
// (shared corner TL) and enters/exits on the top/left screen edges; Region B
// owns RIGHT+BOTTOM (shared corner BR) and uses the right/bottom edges.

type Rng = () => number;
const ri = (rng: Rng, lo: number, hi: number): number =>
  lo + Math.floor(rng() * (hi - lo + 1));

interface SideSet {
  top: Node[];
  left: Node[];
  right: Node[];
  bottom: Node[];
}

function buildSides(fr: FrameRect): SideSet {
  const c0 = fr.col0;
  const c1 = fr.col0 + fr.cols;
  const r0 = fr.row0;
  const r1 = fr.row0 + fr.rows;
  const top: Node[] = [];
  for (let c = c0; c <= c1; c++) top.push({ c, r: r0 }); // TL → TR
  const left: Node[] = [];
  for (let r = r0; r <= r1; r++) left.push({ c: c0, r }); // TL → BL
  const right: Node[] = [];
  for (let r = r1; r >= r0; r--) right.push({ c: c1, r }); // BR → TR
  const bottom: Node[] = [];
  for (let c = c1; c >= c0; c--) bottom.push({ c, r: r1 }); // BR → BL
  return { top, left, right, bottom };
}

interface Option {
  entry: Node[]; // side, from shared corner outward (contact side)
  exit: Node[]; // side, from shared corner outward (peel side)
  entryEdge: (n: Node) => boolean; // node sits on the entry screen edge
  exitDir: Node; // straight-out step toward the exit screen edge
  onExitEdge: (n: Node) => boolean;
}

function options(region: Region, sides: SideSet, g: GridGeom): Option[] {
  if (region === "A") {
    return [
      {
        entry: sides.left,
        exit: sides.top,
        entryEdge: (n) => n.c === 0,
        exitDir: { c: 0, r: -1 },
        onExitEdge: (n) => n.r === 0,
      },
      {
        entry: sides.top,
        exit: sides.left,
        entryEdge: (n) => n.r === 0,
        exitDir: { c: -1, r: 0 },
        onExitEdge: (n) => n.c === 0,
      },
    ];
  }
  return [
    {
      entry: sides.bottom,
      exit: sides.right,
      entryEdge: (n) => n.r === g.rows - 1,
      exitDir: { c: 1, r: 0 },
      onExitEdge: (n) => n.c === g.cols - 1,
    },
    {
      entry: sides.right,
      exit: sides.bottom,
      entryEdge: (n) => n.c === g.cols - 1,
      exitDir: { c: 0, r: 1 },
      onExitEdge: (n) => n.r === g.rows - 1,
    },
  ];
}

/** BFS on the node lattice; returns path from → first goal (inclusive). */
function bfs(
  from: Node,
  isGoal: (n: Node) => boolean,
  allowed: (c: number, r: number) => boolean,
  g: GridGeom,
): Node[] | null {
  const start = key(from.c, from.r);
  const parent = new Map<string, string | null>([[start, null]]);
  const q: Node[] = [from];
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  while (q.length) {
    const cur = q.shift()!;
    if (isGoal(cur) && !(cur.c === from.c && cur.r === from.r)) {
      const path: Node[] = [];
      let k: string | null = key(cur.c, cur.r);
      while (k) {
        const [c, r] = k.split(",").map(Number);
        path.push({ c, r });
        k = parent.get(k) ?? null;
      }
      return path.reverse(); // from → goal
    }
    for (const [dc, dr] of dirs) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) continue;
      const nk = key(nc, nr);
      if (parent.has(nk)) continue;
      if (!allowed(nc, nr)) continue;
      parent.set(nk, key(cur.c, cur.r));
      q.push({ c: nc, r: nr });
    }
  }
  return null;
}

export function planLine(
  g: GridGeom,
  fr: FrameRect,
  region: Region,
  occupied: Set<string>,
  interior: Set<string>,
  traceLength: number,
  rng: Rng,
): Plan | null {
  const sides = buildSides(fr);
  const border = new Set<string>();
  for (const arr of [sides.top, sides.left, sides.right, sides.bottom])
    for (const n of arr) border.add(key(n.c, n.r));

  const opts = options(region, sides, g);
  // Try both entry/exit orientations before giving up.
  for (const opt of rng() < 0.5 ? opts : [opts[1], opts[0]]) {
    const eLen = opt.entry.length;
    const xLen = opt.exit.length;
    const maxSide = Math.min(eLen, xLen) - 2;
    if (maxSide < 1) continue;
    let minSide = 2 + Math.round(traceLength * 0.25) + ri(rng, 0, 1);
    minSide = Math.max(1, Math.min(minSide, maxSide));

    const contactDist = ri(rng, minSide, eLen - 2);
    const peelDist = ri(rng, minSide, xLen - 2);
    const contact = opt.entry[contactDist];
    const peel = opt.exit[peelDist];

    // Approach: BFS from contact out to any entry-edge node. Forbid occupied,
    // interior, and all frame-border nodes except the contact itself.
    const contactKey = key(contact.c, contact.r);
    const allowed = (c: number, r: number): boolean => {
      const k = key(c, r);
      if (k === contactKey) return true;
      if (occupied.has(k) || interior.has(k) || border.has(k)) return false;
      return true;
    };
    const approach = bfs(contact, opt.entryEdge, allowed, g); // contact → edge
    if (!approach) continue;
    const edgeNode = approach[approach.length - 1];

    // Straight-out: from peel, step exitDir to the exit screen edge.
    const out: Node[] = [];
    let cur = { ...peel };
    let outOk = true;
    for (let i = 0; i < g.cols + g.rows; i++) {
      cur = { c: cur.c + opt.exitDir.c, r: cur.r + opt.exitDir.r };
      const k = key(cur.c, cur.r);
      if (occupied.has(k) || interior.has(k) || border.has(k)) {
        outOk = false;
        break;
      }
      out.push({ ...cur });
      if (opt.onExitEdge(cur)) break;
    }
    if (!outOk || out.length === 0 || !opt.onExitEdge(out[out.length - 1])) {
      continue;
    }

    // Assemble the plan: offEntry, approach(edge→contact), trace(contact→
    // shared corner→peel), straight-out(peel→edge), offExit.
    const nodes: Node[] = [];
    // Off-screen entry: one node beyond the edge (opposite the approach's
    // first inward step).
    const inwardStep = {
      c: approach.length > 1 ? approach[approach.length - 2].c - edgeNode.c : 0,
      r: approach.length > 1 ? approach[approach.length - 2].r - edgeNode.r : 0,
    };
    nodes.push({ c: edgeNode.c - inwardStep.c, r: edgeNode.r - inwardStep.r });

    // edge → contact (reverse of contact → edge)
    const edgeToContact = [...approach].reverse();
    for (const n of edgeToContact) nodes.push(n);

    const traceStart = nodes.length - 1; // = contact index

    // trace: contact inward to shared corner, then out to peel
    for (let d = contactDist - 1; d >= 0; d--) nodes.push(opt.entry[d]);
    for (let d = 1; d <= peelDist; d++) nodes.push(opt.exit[d]);

    const traceEnd = nodes.length - 1; // = peel index

    // straight-out then one node off-screen
    for (const n of out) nodes.push(n);
    const last = out[out.length - 1];
    nodes.push({
      c: last.c + opt.exitDir.c,
      r: last.r + opt.exitDir.r,
    });

    // Reserve every on-screen node.
    for (const n of nodes) {
      if (n.c < 0 || n.r < 0 || n.c >= g.cols || n.r >= g.rows) continue;
      occupied.add(key(n.c, n.r));
    }

    return { nodes, traceStart, traceEnd };
  }
  return null;
}
