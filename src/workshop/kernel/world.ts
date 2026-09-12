import type {
  WorldAction,
  WorldState,
  WorldTransition,
} from "./types";

const MIN_CHARGE = 0;
const MAX_CHARGE = 12;
const RECHARGE_PER_TICK = 1;
const LAMP_DRAIN_PER_TICK = 3;

export const INITIAL_WORLD_STATE: Readonly<WorldState> = Object.freeze({
  tick: 0,
  charge: 8,
  lampSwitch: "off",
});

function clampCharge(value: number): number {
  return Math.min(MAX_CHARGE, Math.max(MIN_CHARGE, value));
}

function nextLampSwitch(
  current: WorldState["lampSwitch"],
  action: WorldAction,
): WorldState["lampSwitch"] {
  if (action.kind !== "toggle") {
    return current;
  }

  return current === "off" ? "on" : "off";
}

export function reduceWorld(
  previous: Readonly<WorldState>,
  action: WorldAction,
): WorldTransition {
  const lampSwitch = nextLampSwitch(previous.lampSwitch, action);
  const lampDrain =
    lampSwitch === "on" ? LAMP_DRAIN_PER_TICK : 0;

  const charge = clampCharge(
    previous.charge + RECHARGE_PER_TICK - lampDrain,
  );

  const next: WorldState = {
    tick: previous.tick + 1,
    charge,
    lampSwitch,
  };

  const observedGenerator = action.kind === "observe";

  return {
    previous: {
      tick: previous.tick,
      charge: previous.charge,
      lampSwitch: previous.lampSwitch,
    },
    action,
    next,
    lampLit: lampSwitch === "on" && charge > 0,
    observation: {
      generatorReading: observedGenerator ? charge : null,
      observationTick: observedGenerator ? next.tick : null,
    },
  };
}

export function replayWorld(
  initial: Readonly<WorldState>,
  actions: readonly WorldAction[],
): readonly WorldTransition[] {
  const transitions: WorldTransition[] = [];
  let current: WorldState = {
    tick: initial.tick,
    charge: initial.charge,
    lampSwitch: initial.lampSwitch,
  };

  for (const action of actions) {
    const transition = reduceWorld(current, action);
    transitions.push(transition);
    current = transition.next;
  }

  return transitions;
}