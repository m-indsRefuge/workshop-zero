/** Operator callbacks are separate from the externally owned world projection. */
export interface WorkshopPlaybackControls {
  pause: () => void;
  resume: () => void;
  step: () => void;
  reset: () => void;
}
