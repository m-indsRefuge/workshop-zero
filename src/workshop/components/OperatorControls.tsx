import type { WorkshopPlaybackControls } from "../playback";

interface OperatorControlsProps {
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  statusLabel?: string;
}

export function OperatorControls({ controls, isPaused, statusLabel }: OperatorControlsProps) {
  return (
    <nav className="operator-controls" aria-label="Workshop playback controls">
      <button className="playback-toggle" type="button" onClick={isPaused ? controls.resume : controls.pause}>
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          {isPaused ? <path d="M5 3L14 9L5 15Z" /> : <path d="M5 4V14M12 4V14" />}
        </svg>
        {isPaused ? "Resume" : "Pause"}
      </button>
      <button type="button" onClick={controls.step}>
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M4 4L11 9L4 14ZM14 4V14" /></svg>
        Step
      </button>
      <button type="button" onClick={controls.reset}>
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M4 6A6 6 0 1 1 3 11M4 2V6H8" /></svg>
        Reset
      </button>
      {statusLabel && <span className="playback-status">{statusLabel}</span>}
    </nav>
  );
}
