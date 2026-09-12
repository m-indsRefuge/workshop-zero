export interface WorldState {
  tick: number;
  charge: number;
  lampSwitch: "off" | "on";
}

export type WorldAction =
  | { kind: "observe"; target: "generator" }
  | { kind: "toggle"; target: "lamp" }
  | { kind: "wait" };

export interface WorldObservation {
  generatorReading: number | null;
  observationTick: number | null;
}

export interface WorldTransition {
  previous: WorldState;
  action: WorldAction;
  next: WorldState;
  lampLit: boolean;
  observation: WorldObservation;
}