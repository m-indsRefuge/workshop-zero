import { useId, useRef, useState } from "react";
import type { WorkshopViewState } from "../types";

interface InspectorProps { state: WorkshopViewState }

export function Inspector({ state }: InspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    setIsOpen(false);
    button.current?.focus();
  };
  const rows = [
    ["phase", state.phase],
    ["tick", state.tick],
    ["activity", state.being.activity],
    ["intention", state.being.intention],
    ["uncertainty (self-report)", state.being.uncertainty],
    ["attention", state.being.attentionTarget],
    ["lamp switch", state.lamp.switchedOn ? "on" : "off"],
    ["lamp light", state.lamp.lit ? "lit" : "dark"],
    ["observed gauge", state.generator.visibleReading],
    ["observation tick", state.generator.readingTick],
    ["memory supplied", state.memory.suppliedCount],
    ["memory cited", state.memory.citedCount],
  ] as const;
  return (
    <div className="workshop-inspector" onKeyDown={(event) => {
      if (event.key === "Escape" && isOpen) { event.stopPropagation(); close(); }
    }}>
      <button ref={button} className="inspect-toggle" type="button" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined} onClick={() => setIsOpen((open) => !open)}>
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M3 3H7M3 3V7M15 3H11M15 3V7M3 15H7M3 15V11M15 15H11M15 15V11" /><circle cx="9" cy="9" r="2" /></svg>
        Inspect
      </button>
      {isOpen && (
        <section className="inspector-sheet" id={id} aria-label="State inspection">
          <header className="inspector-heading">
            <div><span className="eyebrow">INSPECTION</span><h2>Supplied state</h2></div>
            <button type="button" className="inspector-close" aria-label="Close inspection" onClick={close}>
              <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M4 4L14 14M14 4L4 14" /></svg>
            </button>
          </header>
          <div className="inspector-content" tabIndex={0} role="region" aria-label="Supplied state values">
            <dl>{rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? "Not supplied"}</dd></div>)}</dl>
            <p>Gauge values are historical observations. Current charge is not supplied to this view.</p>
            <p>Uncertainty is the Being’s self-report.</p>
          </div>
        </section>
      )}
    </div>
  );
}
