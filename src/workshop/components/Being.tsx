import { useId } from "react";
import type { BeingViewState, WorkshopPhase } from "../types";

interface BeingProps {
  phase: WorkshopPhase;
  being: BeingViewState;
}

export function Being({ phase, being }: BeingProps) {
  const id = useId();
  return (
    <section className="workshop-being" data-phase={phase} data-attention={being.attentionTarget ?? "none"} aria-label="Being">
      <svg viewBox="0 0 180 220" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2=".8">
            <stop stopColor="#e0e7e2" />
            <stop offset=".5" stopColor="#afbdb9" />
            <stop offset="1" stopColor="#607474" />
          </linearGradient>
          <linearGradient id={`${id}-right`} x2="1" y2=".6">
            <stop stopColor="#e8eeea" />
            <stop offset=".45" stopColor="#cdd9d3" />
            <stop offset="1" stopColor="#879b96" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop stopColor="#0c171c" stopOpacity=".7" />
            <stop offset="1" stopColor="#0c171c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="91" cy="191" rx="75" ry="19" fill={`url(#${id}-shadow)`} />
        <g className="being-form">
          <path className="being-core" d="M87 48L98 47L102 137L89 172L79 137Z" />
          <g className="being-facet being-facet-left">
            <path d="M83 24L53 46L36 98L49 145L83 178L78 111Z" fill={`url(#${id}-left)`} />
            <path d="M83 24L53 46L55 110L83 178L78 111Z" fill="#dce5df" opacity=".24" />
            <path d="M53 46L36 98L49 145L55 110Z" fill="#425958" opacity=".27" />
            <path d="M83 25L53 46L37 98" fill="none" stroke="#f0f3e9" strokeOpacity=".62" />
          </g>
          <g className="being-facet being-facet-right">
            <path d="M96 25L124 51L139 103L126 146L96 178L102 111Z" fill={`url(#${id}-right)`} />
            <path d="M124 51L139 103L126 146L120 112Z" fill="#384f50" opacity=".27" />
            <path d="M97 26L124 51L120 112L96 177L102 111Z" fill="#edf0dd" opacity=".15" />
            <path d="M97 26L124 51L139 103" fill="none" stroke="#f4f3e0" strokeOpacity=".72" />
          </g>
          <path className="being-seam" d="M90 75V122" fill="none" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
      <span className="sr-only">Being is {phase}.</span>
      {being.attentionTarget && <span className="sr-only">Attention toward {being.attentionTarget}.</span>}
    </section>
  );
}
