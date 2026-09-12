import type { WorldAction, WorldState } from "../kernel/types";
import type { WorkshopIdentity } from "../persistence/types";
import type {
  BeingContext,
  HistoricalGeneratorObservation,
} from "./types";

const AVAILABLE_ACTIONS: readonly WorldAction[] = Object.freeze([
  Object.freeze({
    kind: "observe" as const,
    target: "generator" as const,
  }),
  Object.freeze({
    kind: "toggle" as const,
    target: "lamp" as const,
  }),
  Object.freeze({
    kind: "wait" as const,
  }),
]);

export function createBeingContext(
  identity: Readonly<WorkshopIdentity>,
  world: Readonly<WorldState>,
  generator: Readonly<HistoricalGeneratorObservation>,
): BeingContext {
  const lampOn = world.lampSwitch === "on";

  return {
    self: {
      beingId: identity.beingId,
      createdAt: identity.createdAt,
      beingVersion: identity.beingVersion,
      worldId: identity.worldId,
      worldRulesVersion: identity.worldRulesVersion,
      cognitiveModel: identity.cognitiveModel,
    },
    observation: {
      tick: world.tick,
      lamp: {
        switchedOn: lampOn,
        lit: lampOn && world.charge > 0,
      },
      generator: {
        lastObservedReading: generator.visibleReading,
        observedAtTick: generator.readingTick,
      },
      availableActions: AVAILABLE_ACTIONS.map((action) => ({
        ...action,
      })),
    },
  };
}