// Themes + the live tweak params (the "Grid Console"). Themes are CSS custom
// property sets; the canvas mirrors the same palette in JS so it can draw with
// the active colors without reading computed styles every frame.

export type ThemeName = "blueprint" | "terminal";
export type ImpactFx = "ripple" | "frame" | "burst" | "snap";
export type FrameBorder = "impact" | "always" | "off";

export interface Palette {
  bg: string;
  dot: string;
  line: string;
  accent: string;
  text: string;
  dim: string;
  frame: string;
  panel: string;
}

export const THEMES: Record<ThemeName, Palette> = {
  blueprint: {
    bg: "#08182b",
    dot: "#123a5e",
    line: "#37c8ff",
    accent: "#37c8ff",
    text: "#cfe8ff",
    dim: "#5b86a8",
    frame: "#1c4a72",
    panel: "rgba(8,20,36,.82)",
  },
  terminal: {
    bg: "#04060a",
    dot: "#123a1f",
    line: "#3dff88",
    accent: "#3dff88",
    text: "#c9f5d8",
    dim: "#5a7a66",
    frame: "#164a2c",
    panel: "rgba(6,14,10,.82)",
  },
};

export const THEME_LABEL: Record<ThemeName, string> = {
  blueprint: "Blueprint",
  terminal: "Terminal",
};

export interface Params {
  theme: ThemeName;
  impactFx: ImpactFx;
  frameBorder: FrameBorder;
  /** 0–100; scales line motion speed. */
  motion: number;
  /** 1 or 2 concurrent lines. */
  activeLines: number;
  /** Head travel speed, px/s. */
  lineSpeed: number;
  /** Undraw (retract) speed multiplier. */
  undrawSpeed: number;
  /** Per-side minimum trace length scaler (nodes). */
  traceLength: number;
  /** 0–1 stroke glow (shadowBlur) amount. */
  lineGlow: number;
  /** 0–1 comet-tail heat: how hot/bright the head runs vs the tail. */
  cometHeat: number;
  /** 0–1 extra glow on the leading filled cell (grid fill). */
  edgeBloom: number;
  /** 0–1 shatter-particle intensity as the tail retracts. */
  shatter: number;
  /** Grid node spacing, px. */
  gridSpacing: number;
  /** 0–1 base dot alpha. */
  gridVisibility: number;
  /** Canvas background blur, px. */
  backgroundBlur: number;
  gridFill: boolean;
  cornerPulse: boolean;
  mobilePreview: boolean;
}

export const DEFAULT_PARAMS: Params = {
  theme: "blueprint",
  impactFx: "ripple",
  frameBorder: "impact",
  motion: 55,
  activeLines: 2,
  lineSpeed: 520,
  undrawSpeed: 3,
  traceLength: 14,
  lineGlow: 1,
  cometHeat: 0.7,
  edgeBloom: 0.6,
  shatter: 0.6,
  gridSpacing: 44,
  gridVisibility: 0.55,
  backgroundBlur: 0,
  gridFill: false,
  cornerPulse: true,
  mobilePreview: false,
};

export const IMPACT_FX: ImpactFx[] = ["ripple", "frame", "burst", "snap"];
export const IMPACT_FX_LABEL: Record<ImpactFx, string> = {
  ripple: "Ripple",
  frame: "Draw frame",
  burst: "Particle burst",
  snap: "Snap",
};

export const FRAME_BORDERS: FrameBorder[] = ["impact", "always", "off"];
export const FRAME_BORDER_LABEL: Record<FrameBorder, string> = {
  impact: "On impact",
  always: "Always",
  off: "Off",
};
