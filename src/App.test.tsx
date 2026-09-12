import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WorkshopApplication,
} from "./App";
import type {
  PersistedWorkshop,
  PersistenceSnapshot,
  WorkshopPersistence,
} from "./workshop/persistence/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

class AppMemoryPersistence implements WorkshopPersistence {
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
        beingId: "being-app-test",
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

function tickText(): string | null {
  return document.querySelector(".tick-readout > span")?.textContent ?? null;
}

describe("Workshop application persistent kernel seam", () => {
  it("starts from the persisted canonical projection", async () => {
    const persistence = new AppMemoryPersistence();
    render(<WorkshopApplication persistence={persistence} />);

    expect(await screen.findByText("kernel 0/7")).toBeTruthy();
    expect(tickText()).toBe("0");
    expect(screen.getByText("gauge not observed")).toBeTruthy();
    expect(
      screen.getByLabelText("Lamp dark").getAttribute("data-switched-on"),
    ).toBe("false");
  });

  it("Step commits one real kernel action before projecting it", async () => {
    const persistence = new AppMemoryPersistence();
    render(<WorkshopApplication persistence={persistence} />);

    await screen.findByText("kernel 0/7");

    fireEvent.click(screen.getByRole("button", { name: "Step" }));

    expect(await screen.findByText("kernel 1/7")).toBeTruthy();
    expect(tickText()).toBe("1");
    expect(screen.getByText("gauge 9 / observed tick 1")).toBeTruthy();
    expect(persistence.snapshot.world.tick).toBe(1);
    expect(persistence.snapshot.generator.visibleReading).toBe(9);
  });

  it("Reset persists canonical world state", async () => {
    const persistence = new AppMemoryPersistence();
    render(<WorkshopApplication persistence={persistence} />);

    await screen.findByText("kernel 0/7");

    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    await screen.findByText("kernel 1/7");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(await screen.findByText("kernel 0/7")).toBeTruthy();

    await waitFor(() => {
      expect(persistence.snapshot.world.tick).toBe(0);
    });

    expect(persistence.snapshot.generator.visibleReading).toBeNull();
    expect(persistence.snapshot.probeIndex).toBe(0);
  });

  it("Resume can commit the complete seven-action probe", async () => {
    vi.useFakeTimers();
    const persistence = new AppMemoryPersistence();

    render(<WorkshopApplication persistence={persistence} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("kernel 0/7")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    act(() => {
      vi.advanceTimersByTime(7 * 1600);
    });

    await act(async () => {
      for (let index = 0; index < 20; index += 1) {
        await Promise.resolve();
      }
    });

    expect(screen.getByText("kernel 7/7")).toBeTruthy();
    expect(tickText()).toBe("7");
    expect(screen.getByText("gauge 9 / observed tick 7")).toBeTruthy();
    expect(persistence.snapshot.world.tick).toBe(7);
    expect(persistence.snapshot.probeIndex).toBe(7);
  });
});