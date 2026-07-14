import { useState } from "react";
import {
  FRAME_BORDER_LABEL,
  FRAME_BORDERS,
  IMPACT_FX,
  IMPACT_FX_LABEL,
  type Params,
  THEME_LABEL,
  type ThemeName,
} from "../lib/config.ts";

interface Props {
  params: Params;
  onChange: (patch: Partial<Params>) => void;
  onReplay: () => void;
  onClose: () => void;
}

const THEMES: ThemeName[] = ["blueprint", "terminal"];

export default function GridConsole({ params, onChange, onReplay, onClose }: Props) {
  const num = (k: keyof Params, v: string) => onChange({ [k]: Number(v) } as Partial<Params>);

  return (
    <aside className="console">
      <header>
        <span>◇ GRID CONSOLE</span>
        <button aria-label="close console" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="field">
        <label>Aesthetic</label>
        <select
          value={params.theme}
          onChange={(e) => onChange({ theme: e.target.value as ThemeName })}
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="cols">
        <div className="field">
          <label>Impact FX</label>
          <select
            value={params.impactFx}
            onChange={(e) => onChange({ impactFx: e.target.value as Params["impactFx"] })}
          >
            {IMPACT_FX.map((f) => (
              <option key={f} value={f}>
                {IMPACT_FX_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Frame border</label>
          <select
            value={params.frameBorder}
            onChange={(e) => onChange({ frameBorder: e.target.value as Params["frameBorder"] })}
          >
            {FRAME_BORDERS.map((f) => (
              <option key={f} value={f}>
                {FRAME_BORDER_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Slider label="Motion intensity" k="motion" min={0} max={100} step={1} params={params} onNum={num} />
      <Slider label="Active lines" k="activeLines" min={1} max={2} step={1} params={params} onNum={num} />
      <Slider label="Line speed" k="lineSpeed" min={200} max={900} step={10} params={params} onNum={num} />
      <Slider label="Undraw speed" k="undrawSpeed" min={1} max={6} step={0.5} params={params} onNum={num} />
      <Slider label="Trace length" k="traceLength" min={3} max={20} step={1} params={params} onNum={num} />
      <Slider label="Line glow" k="lineGlow" min={0} max={2} step={0.1} params={params} onNum={num} />
      <Slider label="Comet heat" k="cometHeat" min={0} max={1} step={0.1} params={params} onNum={num} />
      <Slider label="Edge bloom" k="edgeBloom" min={0} max={1} step={0.1} params={params} onNum={num} />
      <Slider label="Shatter" k="shatter" min={0} max={1} step={0.1} params={params} onNum={num} />
      <Slider label="Grid spacing" k="gridSpacing" min={28} max={80} step={2} params={params} onNum={num} />
      <Slider label="Grid visibility" k="gridVisibility" min={0.1} max={1} step={0.05} params={params} onNum={num} />
      <Slider label="Background blur" k="backgroundBlur" min={0} max={8} step={1} params={params} onNum={num} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
        <Check label="Grid fill" k="gridFill" params={params} onChange={onChange} />
        <Check label="Corner pulse" k="cornerPulse" params={params} onChange={onChange} />
        <Check label="Mobile preview" k="mobilePreview" params={params} onChange={onChange} />
      </div>

      <button className="replay" onClick={onReplay}>
        ▸ Replay impact on this section
      </button>

      <ExportSettings params={params} />
    </aside>
  );
}

/** Copy the current params as JSON — paste over DEFAULT_PARAMS in lib/config.ts
 * to make them the defaults. The <pre> is a manual-copy fallback. */
function ExportSettings({ params }: { params: Params }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(params, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      /* clipboard blocked — user can select the <pre> below */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="export">
      <button className="replay" onClick={copy}>
        {copied ? "✓ Copied" : "⧉ Copy settings JSON"}
      </button>
      <pre className="export-json">{json}</pre>
    </div>
  );
}

function Slider({
  label,
  k,
  min,
  max,
  step,
  params,
  onNum,
}: {
  label: string;
  k: keyof Params;
  min: number;
  max: number;
  step: number;
  params: Params;
  onNum: (k: keyof Params, v: string) => void;
}) {
  return (
    <div className="field">
      <label>
        {label} <b>{params[k] as number}</b>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={params[k] as number}
        onChange={(e) => onNum(k, e.target.value)}
      />
    </div>
  );
}

function Check({
  label,
  k,
  params,
  onChange,
}: {
  label: string;
  k: keyof Params;
  params: Params;
  onChange: (patch: Partial<Params>) => void;
}) {
  return (
    <label className="check">
      {label}
      <input
        type="checkbox"
        checked={params[k] as boolean}
        onChange={(e) => onChange({ [k]: e.target.checked } as Partial<Params>)}
      />
    </label>
  );
}
