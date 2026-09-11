import type { WorkshopPlaybackControls } from "../mock/MockWorkshopProvider";
import type { WorkshopViewState } from "../types";
import { Being } from "./Being";
import { Generator } from "./Generator";
import { Inspector } from "./Inspector";
import { Lamp } from "./Lamp";
import { OperatorControls } from "./OperatorControls";
import { Terminal } from "./Terminal";

interface WorkshopSceneProps {
  state: WorkshopViewState;
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  scenarioIndex: number;
  scenarioLength: number;
}

export function WorkshopScene({
  state,
  controls,
  isPaused,
  scenarioIndex,
  scenarioLength,
}: WorkshopSceneProps) {
  return (
    <main className="workshop-shell">
      <header className="workshop-header">
        <div>
          <span className="eyebrow">Workshop Zero</span>
          <strong>tick {state.tick}</strong>
        </div>
        <span className="phase-readout">{state.phase}</span>
      </header>

      <section className="workshop-room" aria-label="Workshop room">
        <Lamp lamp={state.lamp} />
        <Terminal message={state.being.message} />
        <Being phase={state.phase} being={state.being} />
        <Generator generator={state.generator} />
      </section>

      <section className="workshop-status" aria-label="Being status">
        <span>activity: {state.being.activity ?? "-"}</span>
        <span>intention: {state.being.intention ?? "-"}</span>
      </section>

      <OperatorControls
        controls={controls}
        isPaused={isPaused}
        scenarioIndex={scenarioIndex}
        scenarioLength={scenarioLength}
      />

      <Inspector state={state} />
    </main>
  );
}