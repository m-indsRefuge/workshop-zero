import type { WorkshopViewState } from "../types";

interface InspectorProps {
  state: WorkshopViewState;
}

function valueOrDash(value: string | number | null) {
  return value ?? "-";
}

export function Inspector({ state }: InspectorProps) {
  return (
    <details className="workshop-inspector">
      <summary>Inspect</summary>
      <dl>
        <div><dt>phase</dt><dd>{state.phase}</dd></div>
        <div><dt>tick</dt><dd>{state.tick}</dd></div>
        <div><dt>activity</dt><dd>{valueOrDash(state.being.activity)}</dd></div>
        <div><dt>intention</dt><dd>{valueOrDash(state.being.intention)}</dd></div>
        <div><dt>uncertainty</dt><dd>{valueOrDash(state.being.uncertainty)}</dd></div>
        <div><dt>attention</dt><dd>{valueOrDash(state.being.attentionTarget)}</dd></div>
        <div><dt>memory supplied</dt><dd>{state.memory.suppliedCount}</dd></div>
        <div><dt>memory cited</dt><dd>{state.memory.citedCount}</dd></div>
      </dl>
    </details>
  );
}