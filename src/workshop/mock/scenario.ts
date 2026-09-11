import type { WorkshopViewState } from "../types";

const baseState: WorkshopViewState = {
  phase: "idle",
  lamp: { switchedOn: false, lit: false },
  generator: { visibleReading: null, readingTick: null },
  being: {
    activity: "idle",
    intention: null,
    uncertainty: null,
    attentionTarget: null,
    message: null,
  },
  memory: { suppliedCount: 0, citedCount: 0 },
  tick: 0,
};

export const workshopMockScenario: readonly WorkshopViewState[] = [
  baseState,
  {
    ...baseState,
    phase: "deciding",
    being: {
      ...baseState.being,
      activity: "deciding",
      intention: "inspect the power source",
      uncertainty: "high",
      attentionTarget: "generator",
    },
  },
  {
    ...baseState,
    phase: "observing",
    tick: 1,
    being: {
      ...baseState.being,
      activity: "observing generator",
      intention: "inspect the power source",
      uncertainty: "high",
      attentionTarget: "generator",
    },
  },
  {
    ...baseState,
    tick: 1,
    generator: { visibleReading: 9, readingTick: 1 },
    being: {
      ...baseState.being,
      activity: "considering observation",
      intention: "learn how charge changes",
      uncertainty: "medium",
      attentionTarget: "generator",
      message: "The gauge reads 9.",
    },
    memory: { suppliedCount: 1, citedCount: 0 },
  },
  {
    ...baseState,
    phase: "deciding",
    tick: 1,
    generator: { visibleReading: 9, readingTick: 1 },
    being: {
      ...baseState.being,
      activity: "deciding",
      intention: "test whether the lamp changes charge",
      uncertainty: "medium",
      attentionTarget: "lamp",
    },
    memory: { suppliedCount: 1, citedCount: 1 },
  },
  {
    ...baseState,
    phase: "acting",
    tick: 2,
    lamp: { switchedOn: true, lit: false },
    generator: { visibleReading: 9, readingTick: 1 },
    being: {
      ...baseState.being,
      activity: "toggling lamp",
      intention: "test whether the lamp changes charge",
      uncertainty: "medium",
      attentionTarget: "lamp",
    },
    memory: { suppliedCount: 1, citedCount: 1 },
  },
  {
    ...baseState,
    tick: 2,
    lamp: { switchedOn: true, lit: true },
    generator: { visibleReading: 9, readingTick: 1 },
    being: {
      ...baseState.being,
      activity: "idle",
      intention: "observe what changes",
      uncertainty: "medium",
      attentionTarget: "lamp",
      message: "I want to see what changes.",
    },
    memory: { suppliedCount: 2, citedCount: 1 },
  },
  {
    ...baseState,
    phase: "paused",
    tick: 2,
    lamp: { switchedOn: true, lit: true },
    generator: { visibleReading: 9, readingTick: 1 },
    being: {
      ...baseState.being,
      activity: "paused",
      intention: "observe what changes",
      uncertainty: "medium",
      attentionTarget: null,
      message: "I want to see what changes.",
    },
    memory: { suppliedCount: 2, citedCount: 1 },
  },
] as const;

export function getScenarioState(index: number): WorkshopViewState {
  const safeIndex = Math.min(
    Math.max(Math.trunc(index), 0),
    workshopMockScenario.length - 1,
  );
  return structuredClone(workshopMockScenario[safeIndex]);
}

export function getNextScenarioIndex(index: number): number {
  return Math.min(index + 1, workshopMockScenario.length - 1);
}