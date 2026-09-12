import { describe, expect, it } from "vitest";
import type { WorldState } from "../kernel/types";
import type { WorkshopIdentity } from "../persistence/types";
import {
  createBeingContext,
} from "./perceive";
import type {
  HistoricalGeneratorObservation,
} from "./types";

const identity: WorkshopIdentity = {
  beingId: "being-perception-test",
  createdAt: "2026-09-12T00:00:00.000Z",
  beingVersion: "0.1.0",
  worldId: "workshop-zero",
  worldRulesVersion: "workshop-zero-rules-v0",
  cognitiveModel: "not-installed",
};

const unseenGenerator: HistoricalGeneratorObservation = {
  visibleReading: null,
  readingTick: null,
};

describe("Workshop perception boundary", () => {
  it("does not leak hidden charge", () => {
    const lowCharge: WorldState = {
      tick: 5,
      charge: 2,
      lampSwitch: "off",
    };

    const highCharge: WorldState = {
      tick: 5,
      charge: 11,
      lampSwitch: "off",
    };

    const low = createBeingContext(
      identity,
      lowCharge,
      unseenGenerator,
    );

    const high = createBeingContext(
      identity,
      highCharge,
      unseenGenerator,
    );

    expect(low.observation).toEqual(high.observation);
    expect(JSON.stringify(low.observation)).not.toContain("charge");
  });

  it("retains generator readings as historical observations", () => {
    const world: WorldState = {
      tick: 6,
      charge: 8,
      lampSwitch: "off",
    };

    const context = createBeingContext(identity, world, {
      visibleReading: 5,
      readingTick: 3,
    });

    expect(context.observation.generator).toEqual({
      lastObservedReading: 5,
      observedAtTick: 3,
    });
    expect(context.observation.tick).toBe(6);
  });

  it("does not fabricate a generator reading", () => {
    const world: WorldState = {
      tick: 0,
      charge: 8,
      lampSwitch: "off",
    };

    const context = createBeingContext(
      identity,
      world,
      unseenGenerator,
    );

    expect(context.observation.generator).toEqual({
      lastObservedReading: null,
      observedAtTick: null,
    });
  });

  it("exposes observable lamp state without exposing numeric power", () => {
    const world: WorldState = {
      tick: 2,
      charge: 6,
      lampSwitch: "on",
    };

    const context = createBeingContext(
      identity,
      world,
      unseenGenerator,
    );

    expect(context.observation.lamp).toEqual({
      switchedOn: true,
      lit: true,
    });
    expect(JSON.stringify(context.observation)).not.toContain("6");
  });

  it("exposes exactly the three legal V0 actions", () => {
    const world: WorldState = {
      tick: 0,
      charge: 8,
      lampSwitch: "off",
    };

    const context = createBeingContext(
      identity,
      world,
      unseenGenerator,
    );

    expect(context.observation.availableActions).toEqual([
      { kind: "observe", target: "generator" },
      { kind: "toggle", target: "lamp" },
      { kind: "wait" },
    ]);
  });

  it("supplies SELF separately from environment observation", () => {
    const world: WorldState = {
      tick: 1,
      charge: 9,
      lampSwitch: "off",
    };

    const context = createBeingContext(
      identity,
      world,
      unseenGenerator,
    );

    expect(context.self).toEqual(identity);
    expect("beingId" in context.observation).toBe(false);
    expect("createdAt" in context.observation).toBe(false);
  });

  it("contains no UI, persistence, probe, or memory metadata", () => {
    const world: WorldState = {
      tick: 4,
      charge: 6,
      lampSwitch: "off",
    };

    const context = createBeingContext(identity, world, {
      visibleReading: 5,
      readingTick: 3,
    });

    const serialized = JSON.stringify(context.observation);

    for (const forbidden of [
      "charge",
      "probeIndex",
      "phase",
      "memory",
      "isPaused",
      "persistence",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("is deterministic and does not mutate its inputs", () => {
    const world: WorldState = {
      tick: 4,
      charge: 6,
      lampSwitch: "off",
    };

    const generator: HistoricalGeneratorObservation = {
      visibleReading: 5,
      readingTick: 3,
    };

    const beforeIdentity = structuredClone(identity);
    const beforeWorld = structuredClone(world);
    const beforeGenerator = structuredClone(generator);

    const first = createBeingContext(
      identity,
      world,
      generator,
    );
    const second = createBeingContext(
      identity,
      world,
      generator,
    );

    expect(second).toEqual(first);
    expect(identity).toEqual(beforeIdentity);
    expect(world).toEqual(beforeWorld);
    expect(generator).toEqual(beforeGenerator);
  });
});