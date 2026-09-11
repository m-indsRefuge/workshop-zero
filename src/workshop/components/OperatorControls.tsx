import type { WorkshopPlaybackControls } from "../mock/MockWorkshopProvider";

interface OperatorControlsProps {
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  scenarioIndex: number;
  scenarioLength: number;
}

export function OperatorControls({
  controls,
  isPaused,
  scenarioIndex,
  scenarioLength,
}: OperatorControlsProps) {
  return (
    <nav className="operator-controls" aria-label="Workshop playback controls">
      <button type="button" onClick={isPaused ? controls.resume : controls.pause}>
        {isPaused ? "Resume" : "Pause"}
      </button>
      <button type="button" onClick={controls.step}>Step</button>
      <button type="button" onClick={controls.reset}>Reset</button>
      <span className="scenario-position">
        mock {scenarioIndex + 1}/{scenarioLength}
      </span>
    </nav>
  );
}