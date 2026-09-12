import type { WorkshopPlaybackControls } from "../playback";
import type { WorkshopViewState } from "../types";
import { Being } from "./Being";
import { Generator } from "./Generator";
import { Inspector } from "./Inspector";
import { Lamp } from "./Lamp";
import { OperatorControls } from "./OperatorControls";
import { RoomArchitecture } from "./RoomArchitecture";
import { Terminal } from "./Terminal";

interface WorkshopSceneProps {
  state: WorkshopViewState;
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  playbackStatus?: string;
}

export function WorkshopScene({ state, controls, isPaused, playbackStatus }: WorkshopSceneProps) {
  return (
    <main className="workshop-shell">
      <header className="workshop-header">
        <h1><span className="workshop-emblem" aria-hidden="true">w/0</span>Workshop Zero</h1>
        <span className="habitat-label">one room · one being</span>
      </header>
      <div className="room-mount">
        <section className="workshop-room" aria-label="Workshop room" data-lit={state.lamp.lit}>
          <RoomArchitecture />
          <Lamp lamp={state.lamp} />
          <Generator generator={state.generator} />
          <Terminal message={state.being.message} />
          <Being phase={state.phase} being={state.being} />
        </section>
      </div>
      <section className="workshop-status" aria-label="Being status">
        <span className="phase-readout" data-phase={state.phase}><span aria-hidden="true" />{state.phase}</span>
        {state.being.activity && state.being.activity !== state.phase && <span className="activity-readout" title={state.being.activity}>{state.being.activity}</span>}
        <span className="tick-readout">tick <span>{state.tick}</span></span>
      </section>
      <footer className="workshop-footer">
        <OperatorControls controls={controls} isPaused={isPaused} statusLabel={playbackStatus} />
        <Inspector state={state} />
      </footer>
    </main>
  );
}
