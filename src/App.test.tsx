import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("walks the complete deterministic mock sequence through the real application seam", () => {
  vi.useFakeTimers();
  render(<App />);
  expect(screen.getByLabelText("Being").getAttribute("data-phase")).toBe("paused");
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  expect(screen.getByLabelText("Being").getAttribute("data-phase")).toBe("idle");
  for (const phase of ["deciding", "observing", "idle", "deciding", "acting", "idle", "paused"]) {
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByLabelText("Being").getAttribute("data-phase")).toBe(phase);
    if (phase === "acting") {
      expect(screen.getByLabelText("Lamp dark").getAttribute("data-switched-on")).toBe("true");
      expect(screen.getByText("gauge 9 / observed tick 1")).toBeTruthy();
    }
  }
  expect(screen.getByLabelText("Lamp lit")).toBeTruthy();
  expect(screen.getByText("I want to see what changes.")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1600));
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.getByText("gauge not observed")).toBeTruthy();
  expect(screen.getByLabelText("Lamp dark").getAttribute("data-switched-on")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Step" }));
  expect(screen.getByLabelText("Being").getAttribute("data-attention")).toBe("generator");
  expect(screen.getByLabelText("Being").getAttribute("data-phase")).toBe("paused");
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  act(() => vi.advanceTimersByTime(3200));
  expect(screen.getByText("mock 2/8")).toBeTruthy();
});
