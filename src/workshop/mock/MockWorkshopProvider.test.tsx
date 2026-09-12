import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  MockWorkshopProvider,
  useMockWorkshop,
} from "./MockWorkshopProvider";

afterEach(() => {
  cleanup();
});

function MockHarness() {
  const { controls, scenarioIndex } = useMockWorkshop();

  return (
    <>
      <output aria-label="mock index">{scenarioIndex}</output>
      <button type="button" onClick={controls.step}>
        mock step
      </button>
      <button type="button" onClick={controls.reset}>
        mock reset
      </button>
    </>
  );
}

it("keeps the visual mock provider independently usable", () => {
  render(
    <MockWorkshopProvider>
      <MockHarness />
    </MockWorkshopProvider>,
  );

  expect(screen.getByLabelText("mock index").textContent).toBe("0");

  fireEvent.click(screen.getByRole("button", { name: "mock step" }));
  expect(screen.getByLabelText("mock index").textContent).toBe("1");

  fireEvent.click(screen.getByRole("button", { name: "mock reset" }));
  expect(screen.getByLabelText("mock index").textContent).toBe("0");
});