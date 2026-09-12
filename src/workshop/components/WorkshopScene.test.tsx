import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkshopViewState } from "../types";
import { WorkshopScene } from "./WorkshopScene";
afterEach(() => {
  cleanup();
});

const state: WorkshopViewState = {
  phase: "observing",
  tick: 4,
  lamp: { switchedOn: true, lit: true },
  generator: { visibleReading: 7, readingTick: 3 },
  being: {
    activity: "observing generator",
    intention: "test a remembered relationship",
    uncertainty: "medium",
    attentionTarget: "generator",
    message: "I remember the earlier reading.",
  },
  memory: { suppliedCount: 3, citedCount: 2 },
};

describe("WorkshopScene", () => {
  it("renders the state projection without requiring Workshop internals", () => {
    render(
      <WorkshopScene
        state={state}
        controls={{
          pause: vi.fn(),
          resume: vi.fn(),
          step: vi.fn(),
          reset: vi.fn(),
        }}
        isPaused
        playbackStatus="mock 3/8"
      />,
    );

    expect(screen.getByLabelText("Lamp lit")).toBeTruthy();
    expect(screen.getByText(/gauge 7/)).toBeTruthy();
    expect(screen.getByText("I remember the earlier reading.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    expect(screen.getByText("test a remembered relationship")).toBeTruthy();
  });

  it("exposes the mock operator controls", () => {
    const step = vi.fn();

    render(
      <WorkshopScene
        state={state}
        controls={{
          pause: vi.fn(),
          resume: vi.fn(),
          step,
          reset: vi.fn(),
        }}
        isPaused
        playbackStatus="mock 3/8"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(step).toHaveBeenCalledTimes(1);
  });
});