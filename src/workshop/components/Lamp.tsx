import { useId } from "react";
import type { LampViewState } from "../types";

interface LampProps { lamp: LampViewState }

export function Lamp({ lamp }: LampProps) {
  const id = useId();
  return (
    <section className="workshop-lamp" data-switched-on={lamp.switchedOn} data-lit={lamp.lit} aria-label={`Lamp ${lamp.lit ? "lit" : "dark"}`}>
      <svg viewBox="0 0 220 250" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-metal`}>
            <stop stopColor="#63706d" />
            <stop offset=".45" stopColor="#97a198" />
            <stop offset="1" stopColor="#485956" />
          </linearGradient>
          <radialGradient id={`${id}-bulb`}>
            <stop stopColor="#fff1c7" />
            <stop offset="1" stopColor="#d1a464" />
          </radialGradient>
        </defs>
        <path d="M97 0V92" stroke="#152228" strokeWidth="6" />
        <path d="M98 0V92" stroke="#6a7778" strokeWidth="1.5" />
        <path d="M86 3H108" stroke="#8a9490" strokeWidth="4" />
        <rect x="85" y="85" width="24" height="23" rx="4" fill="#56625f" stroke="#829088" />
        <path d="M69 104Q97 94 125 104L151 146Q97 159 43 146Z" fill={`url(#${id}-metal)`} stroke="#273c3e" />
        <path d="M69 105Q97 97 125 105M51 136Q97 145 142 136" fill="none" stroke="#c9cec0" strokeOpacity=".32" />
        <ellipse cx="97" cy="147" rx="54" ry="11" fill="#16252a" stroke="#859189" strokeWidth="2" />
        <ellipse className="lamp-emitter" cx="97" cy="147" rx="43" ry="6" fill={`url(#${id}-bulb)`} />
        <path d="M164 64V179" stroke="#73807b" strokeOpacity=".6" />
        <rect x="155" y="177" width="18" height="30" rx="3" fill="#25363a" stroke="#6b7a77" />
        <rect className="lamp-switch" x="161" y="184" width="6" height="12" rx="1" />
        <text className="machine-etch lamp-switch-label" x="164" y="225" textAnchor="middle">{lamp.switchedOn ? "ON" : "OFF"}</text>
      </svg>
      <span className="sr-only">Switch {lamp.switchedOn ? "on" : "off"}; {lamp.lit ? "lit" : "dark"}.</span>
    </section>
  );
}
