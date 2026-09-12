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
  WorkshopIdentity,
  WorkshopPersistence,
} from "../persistence/types";
import {
  KernelWorkshopProvider,
  useKernelWorkshop,
} from "./KernelWorkshopProvider";

afterEach(() => {
  cleanup();
});

const identity: WorkshopIdentity = {
  beingId: "being-test-stable",
  createdAt: "2026-09-12T00:00:00.000Z",
  beingVersion: "0.1.0",
  worldId: "workshop-zero",
  worldRulesVersion: "workshop-zero-rules-v0",
  cognitiveModel: "not-installed",
};

function canonicalSnapshot(): PersistenceSnapshot {
  return {
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
}

class MemoryPersistence implements WorkshopPersistence {
  public snapshot = canonicalSnapshot();
  public readonly identity = identity;

  async loadOrInitialize(): Promise<PersistedWorkshop> {
    return {
      identity: this.identity,
      snapshot: structuredClone(this.snapshot),
    };
  }

  async saveSnapshot(snapshot: PersistenceSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}

function Harness() {
  const {
    state,
    controls,
    identity: loadedIdentity,
    isReady,
  } = useKernelWorkshop();

  return (
    <>
      <output aria-label="ready">{String(isReady)}</output>
      <output aria-label="being id">
        {loadedIdentity?.beingId ?? "none"}
      </output>
      <output aria-label="tick">{state.tick}</output>
      <output aria-label="lamp">{state.lamp.lit ? "lit" : "dark"}</output>
      <output aria-label="gauge">
        {state.generator.visibleReading ?? "none"}
      </output>
      <button type="button" onClick={controls.step}>
        step
      </button>
      <button type="button" onClick={controls.reset}>
        reset
      </button>
    </>
  );
}

function renderHarness(persistence: WorkshopPersistence) {
  return render(
    <KernelWorkshopProvider persistence={persistence}>
      <Harness />
    </KernelWorkshopProvider>,
  );
}

describe("KernelWorkshopProvider persistence", () => {
  it("restores world and SELF from the same persistence store after remount", async () => {
    const persistence = new MemoryPersistence();

    const first = renderHarness(persistence);

    await waitFor(() => {
      expect(screen.getByLabelText("ready").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "step" }));
    await waitFor(() => {
      expect(screen.getByLabelText("tick").textContent).toBe("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "step" }));
    await waitFor(() => {
      expect(screen.getByLabelText("tick").textContent).toBe("2");
    });

    fireEvent.click(screen.getByRole("button", { name: "step" }));
    await waitFor(() => {
      expect(screen.getByLabelText("tick").textContent).toBe("3");
    });

    expect(screen.getByLabelText("lamp").textContent).toBe("lit");
    expect(screen.getByLabelText("gauge").textContent).toBe("5");
    expect(screen.getByLabelText("being id").textContent).toBe(
      "being-test-stable",
    );

    first.unmount();

    renderHarness(persistence);

    await waitFor(() => {
      expect(screen.getByLabelText("ready").textContent).toBe("true");
      expect(screen.getByLabelText("tick").textContent).toBe("3");
    });

    expect(screen.getByLabelText("lamp").textContent).toBe("lit");
    expect(screen.getByLabelText("gauge").textContent).toBe("5");
    expect(screen.getByLabelText("being id").textContent).toBe(
      "being-test-stable",
    );
  });

  it("Reset persists canonical world without replacing SELF", async () => {
    const persistence = new MemoryPersistence();

    const first = renderHarness(persistence);

    await waitFor(() => {
      expect(screen.getByLabelText("ready").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "step" }));
    await waitFor(() => {
      expect(screen.getByLabelText("tick").textContent).toBe("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "reset" }));

    await waitFor(() => {
      expect(screen.getByLabelText("tick").textContent).toBe("0");
    });

    first.unmount();
    renderHarness(persistence);

    await waitFor(() => {
      expect(screen.getByLabelText("ready").textContent).toBe("true");
      expect(screen.getByLabelText("tick").textContent).toBe("0");
    });

    expect(screen.getByLabelText("gauge").textContent).toBe("none");
    expect(screen.getByLabelText("being id").textContent).toBe(
      "being-test-stable",
    );
  });
});