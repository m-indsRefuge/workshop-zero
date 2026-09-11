export type WorkshopPhase =
  | "idle"
  | "deciding"
  | "observing"
  | "acting"
  | "paused"
  | "error";

export type WorkshopUncertainty = "low" | "medium" | "high";

export type WorkshopAttentionTarget = "generator" | "lamp";

export interface LampViewState {
  switchedOn: boolean;
  lit: boolean;
}

export interface GeneratorViewState {
  visibleReading: number | null;
  readingTick: number | null;
}

export interface BeingViewState {
  activity: string | null;
  intention: string | null;
  uncertainty: WorkshopUncertainty | null;
  attentionTarget: WorkshopAttentionTarget | null;
  message: string | null;
}

export interface MemoryViewState {
  suppliedCount: number;
  citedCount: number;
}

export interface WorkshopViewState {
  phase: WorkshopPhase;
  lamp: LampViewState;
  generator: GeneratorViewState;
  being: BeingViewState;
  memory: MemoryViewState;
  tick: number;
}