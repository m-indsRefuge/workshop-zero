import type { BeingViewState, WorkshopPhase } from "../types";

interface BeingProps {
  phase: WorkshopPhase;
  being: BeingViewState;
}

export function Being({ phase, being }: BeingProps) {
  return (
    <section
      className="workshop-being"
      data-phase={phase}
      data-attention={being.attentionTarget ?? "none"}
      aria-label="Being"
    >
      <div className="being-mark" aria-hidden="true">B</div>
      <div className="being-copy">
        <strong>Being</strong>
        <span>{being.activity ?? phase}</span>
      </div>
    </section>
  );
}