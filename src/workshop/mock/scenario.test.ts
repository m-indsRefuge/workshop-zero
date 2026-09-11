import { describe, expect, it } from "vitest";
import {
  getNextScenarioIndex,
  getScenarioState,
  workshopMockScenario,
} from "./scenario";

describe("Workshop mock scenario", () => {
  it("has a deterministic ordered sequence", () => {
    expect(workshopMockScenario[0].phase).toBe("idle");
    expect(workshopMockScenario[1].phase).toBe("deciding");
    expect(workshopMockScenario[2].phase).toBe("observing");
    expect(workshopMockScenario[workshopMockScenario.length - 1]?.phase).toBe("paused");
  });

  it("does not step past the terminal state", () => {
    const last = workshopMockScenario.length - 1;
    expect(getNextScenarioIndex(last)).toBe(last);
  });

  it("returns an isolated state copy", () => {
    const first = getScenarioState(0);
    first.being.activity = "changed by test";
    expect(workshopMockScenario[0].being.activity).toBe("idle");
  });
});