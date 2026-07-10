# ryan-price.dev — Flourishes Design Brief

A brief for prototyping visual flourishes for my personal site's landing page.
The engineering scaffolding exists; this is about the *feel*.

## What the site is

A single-screen personal landing page for a full-stack engineer. Minimal,
a little playful. The whole page is essentially one hero: a name, a tagline,
and a living, generative background.

## The current visual system

- **Background:** a full-screen dot grid (evenly spaced square cells) on a warm
  off-white (`stone-200`, `#e7e5e4`). The dots are soft gray (`#78716c`) and
  gently blurred so they read as texture, not detail.
- **The line:** a single tomato-red (`#ff6347`) stroke, ~4px, rounded caps,
  that procedurally random-walks the grid — always 90° turns, snapping between
  dots. It draws itself in, completes a path, then a new one begins. Also
  slightly blurred so it glows rather than cuts.
  - **It never doubles back or crosses itself** (self-avoiding walk) — the path
    is always clean and legible.
  - **Every line begins and ends on an edge of the screen** — it enters from one
    side, wanders, and runs off another (or the same) side. Lines are never left
    dangling in the middle.
- **Title card:** centered. `h1` "Ryan Price" (bold, ~text-7xl) and `h2`
  "Full Stack Engineer & Cool Guy" (~text-4xl), near-black (`stone-900`).
  Sits above the background. No box/border today — just type on the texture.

## The signature interaction (already built)

When the wandering line reaches the title card, it doesn't pass through — it
**traces a full lap around the card's perimeter** (a rectangle ~20px outside the
text), then peels back off into its random walk. While it's circling, the title
text plays a **shimmer** (a tomato-colored light band sweeping across the
letters).

This "the background acknowledges the content" moment is the heart of the page.
Everything we prototype should make that moment feel more intentional and alive.

## What I want to explore

Treat these as a menu — prototype variations, mix freely, propose your own.

### The shimmer (highest priority)
- Alternatives to the single sweep: a quick double-flash, a ripple that
  emanates from the point where the line touches the card, a warm glow that
  swells and fades, individual letters lighting in sequence.
- Should it feel *electric* (crisp, fast, neon) or *warm* (soft bloom)? Show both.
- Consider tying the shimmer's origin/direction to where the line entered.

### The line
- Trailing fade / comet tail so the head is brightest and the tail dims.
- Subtle glow/bloom around the stroke; a faint after-image on the grid it passed.
- A tiny bright "head" dot leading the stroke.
- Speed/easing personality — currently constant; try ease-in-out per segment.

### The card
- Does it deserve a surface? Explore a faint frosted/blurred panel, a thin
  hairline border that the line "hands off" to, or nothing (type only).
- Micro-reaction on contact: a 1–2px settle/nudge, a shadow that deepens as the
  line passes a given side.

### The grid
- Dots near the line brightening/scaling as it passes (a light "wake").
- Very slow ambient drift or twinkle so the field isn't fully static.

### Entrance / first load
- How the whole scene arrives: grid fading up, first line drawing on, title
  settling in. Should feel composed, ~1–1.5s, not flashy.

## Palette & type

- Base: `stone-200` (`#e7e5e4`) background, `stone-900` (`#1c1917`) text.
- Accent: tomato `#ff6347` (the line + shimmer highlight). Open to a secondary
  accent if a flourish needs it.
- Type: currently system/Inter-ish, bold display for the name. Type direction is
  open — suggest something with personality if it helps.

## Fixed behaviors (please design around these)

These are guaranteed by the generator; treat them as givens:

- The line **never doubles back or crosses itself**.
- Each line **starts and ends on a screen edge**.
- On contact with the card, the line **circles the entire card once** before
  leaving, and the title **shimmers** for the duration of that lap.

## Constraints

- It's a **background** — flourishes must stay subtle enough that the name and
  tagline remain the focus and readable.
- Must respect `prefers-reduced-motion` (offer a calm/static fallback).
- Runs continuously in a `requestAnimationFrame` loop — keep effects cheap
  enough to hold 60fps on a laptop.
- Deliverables I can use: annotated mockups, short motion studies / GIFs, or
  CSS/canvas snippets I can drop in.
