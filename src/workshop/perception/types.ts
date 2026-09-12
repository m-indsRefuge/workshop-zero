import type { WorldAction } from "../kernel/types";
import type { WorkshopIdentity } from "../persistence/types";

export type BeingSelf = WorkshopIdentity;

export interface HistoricalGeneratorObservation {
  visibleReading: number | null;
  readingTick: number | null;
}

export interface BeingGeneratorObservation {
  lastObservedReading: number | null;
  observedAtTick: number | null;
}

export interface BeingLampObservation {
  switchedOn: boolean;
  lit: boolean;
}

export interface BeingObservation {
  tick: number;
  lamp: BeingLampObservation;
  generator: BeingGeneratorObservation;
  availableActions: readonly WorldAction[];
}

export interface BeingContext {
  self: BeingSelf;
  observation: BeingObservation;
}