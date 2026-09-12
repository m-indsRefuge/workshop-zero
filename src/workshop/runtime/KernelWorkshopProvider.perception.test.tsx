import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type {
  PersistedWorkshop,
  PersistenceSnapshot,
  WorkshopPersistence,
} from "../persistence/types";
import {
  KernelWorkshopProvider,
  useKernelWorkshop,
} from "./KernelWorkshopProvider";

afterEach(() => {
  cleanup();
});

class PerceptionMemoryPersistence implements WorkshopPersistence {
  snapshot: PersistenceSnapshot = {
    world: {
      tick: 0,
      charge: 8,
      lampSwitch: "off",
    },
    generator: {
      visibleReading: null,
      readingTick: null,
    },
    probeIndex: 0,
  };

  async loadOrInitialize(): Promise<PersistedWorkshop> {
    return {
      identity: {
        beingId: "being-perception-provider",
        createdAt: "2026-09-12T00:00:00.000Z",
        beingVersion: "0.1.0",
        worldId: "workshop-zero",
        worldRulesVersion: "workshop-zero-rules-v0",
        cognitiveModel: "not-installed",
      },
      snapshot: structuredClone(this.snapshot),
    };
  }

  async saveSnapshot(snapshot: PersistenceSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}

function Harness() {
  const {
    controls,
    isReady,
    beingContext,
  } = useKernelWorkshop();

  return (
    <>
      <output aria-label="ready">{String(isReady)}</output>
      <output aria-label="context">
        {beingContext === null
          ? "none"
          : JSON.stringify(beingContext)}
      </output>
      <button type="button" onClick={controls.step}>
        step
      </button>
    </>
  );
}

describe("KernelWorkshopProvider perception seam", () => {
  it("supplies SELF plus an initially unobserved environment", async () => {
    const persistence = new PerceptionMemoryPersistence();

    render(
      <KernelWorkshopProvider persistence={persistence}>
        <Harness />
      </KernelWorkshopProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("ready").textContent).toBe("true");
    });

    const context = JSON.parse(
      screen.getByLabelText("context").textContent ?? "null",
    );

    expect(context.self.beingId).toBe(
      "being-perception-provider",
    );
    expect(context.observation.tick).toBe(0);
    expect(context.observation.generator).toEqual({
      lastObservedReading: null,
      observedAtTick: null,
    });

    const serializedObservation = JSON.stringify(
      context.observation,
    );

    expect(serializedObservation).not.toContain("charge");
    expect(serializedObservation).not.toContain("probeIndex");
    expect(serializedObservation).not.toContain("phase");
  });

  it("updates only the permitted observation after real kernel actions", async () => {
    const persistence = new PerceptionMemoryPersistence();

    render(
      <KernelWorkshopProvider persistence={persistence}>
        <Harness />
      </KernelWorkshopProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("ready").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "step" }));

    await waitFor(() => {
      const context = JSON.parse(
        screen.getByLabelText("context").textContent ?? "null",
      );
      expect(context.observation.tick).toBe(1);
    });

    let context = JSON.parse(
      screen.getByLabelText("context").textContent ?? "null",
    );

    expect(context.observation.generator).toEqual({
      lastObservedReading: 9,
      observedAtTick: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "step" }));

    await waitFor(() => {
      const nextContext = JSON.parse(
        screen.getByLabelText("context").textContent ?? "null",
      );
      expect(nextContext.observation.tick).toBe(2);
    });

    context = JSON.parse(
      screen.getByLabelText("context").textContent ?? "null",
    );

    expect(context.observation.lamp).toEqual({
      switchedOn: true,
      lit: true,
    });

    const serializedObservation = JSON.stringify(
      context.observation,
    );

    expect(serializedObservation).not.toContain("charge");
    expect(serializedObservation).not.toContain("probeIndex");
  });
});