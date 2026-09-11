import { describe, expect, it } from "vitest";
import type { WorkshopViewState } from "./types";

describe("WorkshopViewState", () => {
  it("holds the complete UI projection without Workshop internals", () => {
    const state = {
      phase: "observing",
      lamp: { switchedOn: false, lit: false },
      generator: { visibleReading: 9, readingTick: 1 },
      being: {
        activity: "observing generator",
        intention: "learn how charge changes",
        uncertainty: "high",
        attentionTarget: "generator",
        message: null,
      },
      memory: { suppliedCount: 2, citedCount: 1 },
      tick: 1,
    } satisfies WorkshopViewState;

    expect(state.tick).toBe(1);
    expect(state.generator.visibleReading).toBe(9);
    expect(state.being.attentionTarget).toBe("generator");
  });
});