import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function tickText(): string | null {
  return document.querySelector(".tick-readout > span")?.textContent ?? null;
}

describe("Workshop application real kernel seam", () => {
  it("starts from the canonical kernel projection", () => {
    render(<App />);

    expect(screen.getByText("kernel 0/7")).toBeTruthy();
    expect(tickText()).toBe("0");
    expect(screen.getByText("gauge not observed")).toBeTruthy();
    expect(
      screen.getByLabelText("Lamp dark").getAttribute("data-switched-on"),
    ).toBe("false");
    expect(screen.getByLabelText("Being").getAttribute("data-phase")).toBe(
      "paused",
    );
  });

  it("Step executes exactly one real kernel action and retains historical observations", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Step" }));

    expect(screen.getByText("kernel 1/7")).toBeTruthy();
    expect(tickText()).toBe("1");
    expect(screen.getByText("gauge 9 / observed tick 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Step" }));

    expect(screen.getByText("kernel 2/7")).toBeTruthy();
    expect(tickText()).toBe("2");
    expect(screen.getByLabelText("Lamp lit")).toBeTruthy();
    expect(screen.getByText("gauge 9 / observed tick 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Step" }));

    expect(screen.getByText("kernel 3/7")).toBeTruthy();
    expect(tickText()).toBe("3");
    expect(screen.getByText("gauge 5 / observed tick 3")).toBeTruthy();
  });

  it("Reset restores the canonical world and clears historical observation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByText("kernel 0/7")).toBeTruthy();
    expect(tickText()).toBe("0");
    expect(screen.getByText("gauge not observed")).toBeTruthy();
    expect(
      screen.getByLabelText("Lamp dark").getAttribute("data-switched-on"),
    ).toBe("false");
  });

  it("Resume executes the seven-action probe against the real reducer", () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    for (let index = 0; index < 7; index += 1) {
      act(() => {
        vi.advanceTimersByTime(1600);
      });
    }

    expect(screen.getByText("kernel 7/7")).toBeTruthy();
    expect(tickText()).toBe("7");
    expect(screen.getByText("gauge 9 / observed tick 7")).toBeTruthy();
    expect(
      screen.getByLabelText("Lamp dark").getAttribute("data-switched-on"),
    ).toBe("false");
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  });
});