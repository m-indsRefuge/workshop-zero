import { useId } from "react";
import type { GeneratorViewState } from "../types";

interface GeneratorProps { generator: GeneratorViewState }

export function Generator({ generator }: GeneratorProps) {
  const id = useId();
  const hasReading = generator.visibleReading !== null;
  const observation = generator.readingTick === null ? "observation tick not supplied" : `observed tick ${generator.readingTick}`;
  return (
    <section className="workshop-generator" data-observed={hasReading} aria-label="Generator">
      <svg viewBox="0 0 240 225" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-body`} x2=".7" y2="1">
            <stop stopColor="#65716c" />
            <stop offset="1" stopColor="#414f4c" />
          </linearGradient>
        </defs>
        <ellipse cx="127" cy="194" rx="96" ry="14" fill="#0c1a20" opacity=".36" />
        <path d="M39 43L61 29H180L200 43V174L179 189H39Z" fill="#283b3d" stroke="#13252b" strokeWidth="3" />
        <path d="M39 43L61 29H180L200 43Z" fill="#85908a" opacity=".65" />
        <rect x="34" y="43" width="146" height="144" rx="7" fill={`url(#${id}-body)`} stroke="#91a098" strokeOpacity=".5" />
        <path d="M180 51H194V177H180" fill="#354744" />
        <path d="M49 185V196H69V187M145 187V196H165V185" fill="#243438" />
        <rect x="53" y="65" width="108" height="68" rx="4" fill="#202f33" stroke="#86988e" strokeOpacity=".6" />
        <rect x="61" y="73" width="92" height="52" rx="2" fill="#102227" />
        <g stroke="#263a3c" strokeWidth="4" strokeLinecap="round">
          {[148, 157, 166].map((y) => <path key={y} d={`M57 ${y}H126`} />)}
        </g>
        <circle cx="149" cy="155" r="9" fill="#253b3b" stroke="#94a096" strokeOpacity=".4" />
        <path d="M145 159L153 151" stroke="#778980" strokeWidth="2" />
        <g fill="#b3beb0" opacity=".6">
          {[[44, 54], [171, 54], [44, 176], [171, 176]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />)}
        </g>
      </svg>
      <div className="generator-reading" aria-hidden="true">
        <span className="instrument-label">observed</span>
        <span className="gauge-value">{hasReading ? generator.visibleReading : "—"}</span>
      </div>
      <div className="generator-caption" aria-hidden="true">
        <span>last observation</span>
        <span>{hasReading ? generator.readingTick === null ? "tick not supplied" : `tick ${generator.readingTick}` : "not yet observed"}</span>
      </div>
      <span className="sr-only">{hasReading ? `gauge ${generator.visibleReading} / ${observation}` : "gauge not observed"}</span>
    </section>
  );
}
