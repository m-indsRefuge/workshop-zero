import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkshopPhase, WorkshopViewState } from "../types";
import { WorkshopScene } from "./WorkshopScene";

afterEach(cleanup);

const state: WorkshopViewState = {
  phase: "idle",
  tick: 12,
  lamp: { switchedOn: false, lit: false },
  generator: { visibleReading: null, readingTick: null },
  being: {
    activity: null,
    intention: null,
    uncertainty: null,
    attentionTarget: null,
    message: null,
  },
  memory: { suppliedCount: 0, citedCount: 0 },
};

function scene(value: WorkshopViewState = state, isPaused = true) {
  return (
    <WorkshopScene
      state={value}
      controls={{ pause: vi.fn(), resume: vi.fn(), step: vi.fn(), reset: vi.fn() }}
      isPaused={isPaused}
      playbackStatus="mock 1/8"
    />
  );
}

describe("Workshop artifact state honesty", () => {
  it.each<WorkshopPhase>(["idle", "deciding", "observing", "acting", "paused", "error"])(
    "represents the supplied %s phase independently of playback",
    (phase) => {
      render(scene({ ...state, phase }));
      expect(screen.getByLabelText("Being").getAttribute("data-phase")).toBe(phase);
      expect(within(screen.getByLabelText("Being")).getByText(`Being is ${phase}.`)).toBeTruthy();
    },
  );

  it.each(["generator", "lamp", null] as const)("projects attention to %s without selecting a target", (attentionTarget) => {
    render(scene({ ...state, being: { ...state.being, attentionTarget } }));
    expect(screen.getByLabelText("Being").getAttribute("data-attention")).toBe(attentionTarget ?? "none");
  });

  it.each([
    { switchedOn: false, lit: false },
    { switchedOn: true, lit: false },
    { switchedOn: true, lit: true },
    { switchedOn: false, lit: true },
  ])("keeps switch=$switchedOn and light=$lit independent", (lamp) => {
    render(scene({ ...state, lamp }));
    const object = screen.getByLabelText(lamp.lit ? "Lamp lit" : "Lamp dark");
    expect(object.getAttribute("data-switched-on")).toBe(String(lamp.switchedOn));
    expect(object.getAttribute("data-lit")).toBe(String(lamp.lit));
    expect(screen.getByLabelText("Workshop room").getAttribute("data-lit")).toBe(String(lamp.lit));
    expect(within(object).getByText(`Switch ${lamp.switchedOn ? "on" : "off"}; ${lamp.lit ? "lit" : "dark"}.`)).toBeTruthy();
  });

  it("leaves an unobserved gauge without a fabricated number", () => {
    render(scene());
    const generator = within(screen.getByLabelText("Generator"));
    expect(generator.getByText("gauge not observed")).toBeTruthy();
    expect(generator.queryByText(/gauge \d/)).toBeNull();
  });

  it("retains a zero reading and its historical tick as the current tick advances", () => {
    const observed = { ...state, generator: { visibleReading: 0, readingTick: 3 } };
    const { rerender } = render(scene(observed));
    expect(screen.getByText("gauge 0 / observed tick 3")).toBeTruthy();
    rerender(scene({ ...observed, tick: 22 }));
    expect(screen.getByText("gauge 0 / observed tick 3")).toBeTruthy();
    expect(within(screen.getByLabelText("Generator")).getByText(/last observation/i)).toBeTruthy();
  });

  it("does not substitute the current tick for a missing observation tick", () => {
    render(scene({ ...state, generator: { visibleReading: 7, readingTick: null } }));
    expect(screen.getByText("gauge 7 / observation tick not supplied")).toBeTruthy();
  });

  it("keeps terminal communication optional and displays supplied text literally", () => {
    const { rerender } = render(scene());
    expect(within(screen.getByLabelText("Terminal")).getByText("No message supplied.")).toBeTruthy();
    expect(screen.queryByText("...")).toBeNull();
    const message = '<script>untrusted text</script> & a long supplied observation. '.repeat(10);
    rerender(scene({ ...state, being: { ...state.being, message } }));
    const terminal = screen.getByLabelText("Terminal");
    expect(terminal.textContent).toContain(message);
    expect(terminal.querySelector("script")).toBeNull();
  });

  it("keeps technical metadata behind inspection and labels uncertainty as a self-report", () => {
    render(scene({
      ...state,
      being: { ...state.being, intention: "inspect the lamp", uncertainty: "high" },
      memory: { suppliedCount: 7, citedCount: 2 },
    }));
    expect(screen.queryByRole("region", { name: "State inspection" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    const inspector = within(screen.getByRole("region", { name: "State inspection" }));
    expect(inspector.getByText("uncertainty (self-report)")).toBeTruthy();
    expect(inspector.getByText("high")).toBeTruthy();
    expect(inspector.getByText("inspect the lamp")).toBeTruthy();
    expect(inspector.getByText("memory supplied").nextElementSibling?.textContent).toBe("7");
    expect(inspector.getByText("memory cited").nextElementSibling?.textContent).toBe("2");
    expect(inspector.getByText("observation tick").nextElementSibling?.textContent).toBe("Not supplied");
  });

  it("closes inspection with Escape and returns keyboard focus to Inspect", () => {
    render(scene());
    const inspect = screen.getByRole("button", { name: "Inspect" });
    fireEvent.click(inspect);
    const close = screen.getByRole("button", { name: "Close inspection" });
    close.focus();
    fireEvent.keyDown(close, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "State inspection" })).toBeNull();
    expect(document.activeElement).toBe(inspect);
    expect(inspect.getAttribute("aria-expanded")).toBe("false");
  });

  it("delegates all operator actions without mutating supplied state", () => {
    const controls = { pause: vi.fn(), resume: vi.fn(), step: vi.fn(), reset: vi.fn() };
    const before = structuredClone(state);
    const props = { state, controls };
    const { rerender } = render(<WorkshopScene {...props} isPaused />);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    rerender(<WorkshopScene {...props} isPaused={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    for (const control of Object.values(controls)) expect(control).toHaveBeenCalledTimes(1);
    expect(state).toEqual(before);
  });
});
