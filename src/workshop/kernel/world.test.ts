import { describe, expect, it } from "vitest";
import type { WorldAction, WorldState } from "./types";
import {
  INITIAL_WORLD_STATE,
  reduceWorld,
  replayWorld,
} from "./world";

describe("Workshop deterministic world", () => {
  it("starts from the canonical V0 state", () => {
    expect(INITIAL_WORLD_STATE).toEqual({
      tick: 0,
      charge: 8,
      lampSwitch: "off",
    });
  });

  it("wait advances one tick and restores one charge", () => {
    const transition = reduceWorld(INITIAL_WORLD_STATE, {
      kind: "wait",
    });

    expect(transition.next).toEqual({
      tick: 1,
      charge: 9,
      lampSwitch: "off",
    });
    expect(transition.lampLit).toBe(false);
  });

  it("observe generator returns the post-transition reading", () => {
    const transition = reduceWorld(INITIAL_WORLD_STATE, {
      kind: "observe",
      target: "generator",
    });

    expect(transition.observation).toEqual({
      generatorReading: 9,
      observationTick: 1,
    });
  });

  it("toggle on applies lamp load in the same tick", () => {
    const transition = reduceWorld(INITIAL_WORLD_STATE, {
      kind: "toggle",
      target: "lamp",
    });

    expect(transition.next).toEqual({
      tick: 1,
      charge: 6,
      lampSwitch: "on",
    });
    expect(transition.lampLit).toBe(true);
  });

  it("toggle off permits immediate recovery", () => {
    const state: WorldState = {
      tick: 7,
      charge: 0,
      lampSwitch: "on",
    };

    const transition = reduceWorld(state, {
      kind: "toggle",
      target: "lamp",
    });

    expect(transition.next).toEqual({
      tick: 8,
      charge: 1,
      lampSwitch: "off",
    });
    expect(transition.lampLit).toBe(false);
  });

  it("clamps charge at zero", () => {
    const state: WorldState = {
      tick: 3,
      charge: 1,
      lampSwitch: "on",
    };

    expect(
      reduceWorld(state, { kind: "wait" }).next.charge,
    ).toBe(0);
  });

  it("clamps charge at twelve", () => {
    const state: WorldState = {
      tick: 20,
      charge: 12,
      lampSwitch: "off",
    };

    expect(
      reduceWorld(state, { kind: "wait" }).next.charge,
    ).toBe(12);
  });

  it("does not mutate the input state", () => {
    const state: WorldState = {
      tick: 4,
      charge: 5,
      lampSwitch: "off",
    };
    const before = structuredClone(state);

    reduceWorld(state, {
      kind: "toggle",
      target: "lamp",
    });

    expect(state).toEqual(before);
  });

  it("replays action history deterministically", () => {
    const actions: readonly WorldAction[] = [
      { kind: "observe", target: "generator" },
      { kind: "toggle", target: "lamp" },
      { kind: "observe", target: "generator" },
      { kind: "toggle", target: "lamp" },
      { kind: "observe", target: "generator" },
      { kind: "wait" },
      { kind: "observe", target: "generator" },
    ];

    const first = replayWorld(INITIAL_WORLD_STATE, actions);
    const second = replayWorld(INITIAL_WORLD_STATE, actions);

    expect(second).toEqual(first);
    expect(first.map((entry) => entry.next.charge)).toEqual([
      9, 7, 5, 6, 7, 8, 9,
    ]);
  });
});