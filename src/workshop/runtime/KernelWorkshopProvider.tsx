import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WorldAction, WorldState } from "../kernel/types";
import {
  INITIAL_WORLD_STATE,
  reduceWorld,
} from "../kernel/world";
import type { WorkshopPlaybackControls } from "../playback";
import type {
  WorkshopAttentionTarget,
  WorkshopPhase,
  WorkshopViewState,
} from "../types";
import { DEVELOPMENT_PROBE } from "./developmentProbe";

interface HistoricalGeneratorObservation {
  visibleReading: number | null;
  readingTick: number | null;
}

interface KernelRuntimeState {
  world: WorldState;
  lastAction: WorldAction | null;
  generator: HistoricalGeneratorObservation;
  probeIndex: number;
}

interface KernelWorkshopContextValue {
  state: WorkshopViewState;
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  probeIndex: number;
  probeLength: number;
}

const KernelWorkshopContext =
  createContext<KernelWorkshopContextValue | null>(null);

const PROBE_INTERVAL_MS = 1600;

function canonicalWorld(): WorldState {
  return {
    tick: INITIAL_WORLD_STATE.tick,
    charge: INITIAL_WORLD_STATE.charge,
    lampSwitch: INITIAL_WORLD_STATE.lampSwitch,
  };
}

function initialRuntime(): KernelRuntimeState {
  return {
    world: canonicalWorld(),
    lastAction: null,
    generator: {
      visibleReading: null,
      readingTick: null,
    },
    probeIndex: 0,
  };
}

function phaseForAction(
  action: WorldAction | null,
  isPaused: boolean,
): WorkshopPhase {
  if (isPaused) {
    return "paused";
  }

  if (action === null || action.kind === "wait") {
    return "idle";
  }

  if (action.kind === "observe") {
    return "observing";
  }

  return "acting";
}

function attentionForAction(
  action: WorldAction | null,
): WorkshopAttentionTarget | null {
  if (action === null || action.kind === "wait") {
    return null;
  }

  return action.target;
}

function projectView(
  runtime: KernelRuntimeState,
  isPaused: boolean,
): WorkshopViewState {
  const lampOn = runtime.world.lampSwitch === "on";

  return {
    phase: phaseForAction(runtime.lastAction, isPaused),
    lamp: {
      switchedOn: lampOn,
      lit: lampOn && runtime.world.charge > 0,
    },
    generator: {
      visibleReading: runtime.generator.visibleReading,
      readingTick: runtime.generator.readingTick,
    },
    being: {
      activity: null,
      intention: null,
      uncertainty: null,
      attentionTarget: attentionForAction(runtime.lastAction),
      message: null,
    },
    memory: {
      suppliedCount: 0,
      citedCount: 0,
    },
    tick: runtime.world.tick,
  };
}

function advanceRuntime(current: KernelRuntimeState): KernelRuntimeState {
  if (current.probeIndex >= DEVELOPMENT_PROBE.length) {
    return current;
  }

  const action = DEVELOPMENT_PROBE[current.probeIndex];
  const transition = reduceWorld(current.world, action);

  const generator =
    transition.observation.generatorReading === null
      ? current.generator
      : {
          visibleReading: transition.observation.generatorReading,
          readingTick: transition.observation.observationTick,
        };

  return {
    world: transition.next,
    lastAction: action,
    generator,
    probeIndex: current.probeIndex + 1,
  };
}

export function KernelWorkshopProvider({
  children,
}: PropsWithChildren) {
  const [runtime, setRuntime] = useState<KernelRuntimeState>(initialRuntime);
  const [isPaused, setIsPaused] = useState(true);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const step = useCallback(() => {
    setRuntime((current) => advanceRuntime(current));
  }, []);

  const reset = useCallback(() => {
    setRuntime(initialRuntime());
    setIsPaused(true);
  }, []);

  useEffect(() => {
    if (
      !isPaused &&
      runtime.probeIndex >= DEVELOPMENT_PROBE.length
    ) {
      setIsPaused(true);
    }
  }, [isPaused, runtime.probeIndex]);

  useEffect(() => {
    if (isPaused || runtime.probeIndex >= DEVELOPMENT_PROBE.length) {
      return;
    }

    const handle = window.setInterval(() => {
      setRuntime((current) => advanceRuntime(current));
    }, PROBE_INTERVAL_MS);

    return () => {
      window.clearInterval(handle);
    };
  }, [isPaused, runtime.probeIndex]);

  const state = useMemo(
    () => projectView(runtime, isPaused),
    [isPaused, runtime],
  );

  const controls = useMemo<WorkshopPlaybackControls>(
    () => ({
      pause,
      resume,
      step,
      reset,
    }),
    [pause, reset, resume, step],
  );

  const value = useMemo<KernelWorkshopContextValue>(
    () => ({
      state,
      controls,
      isPaused,
      probeIndex: runtime.probeIndex,
      probeLength: DEVELOPMENT_PROBE.length,
    }),
    [controls, isPaused, runtime.probeIndex, state],
  );

  return (
    <KernelWorkshopContext.Provider value={value}>
      {children}
    </KernelWorkshopContext.Provider>
  );
}

export function useKernelWorkshop(): KernelWorkshopContextValue {
  const context = useContext(KernelWorkshopContext);

  if (!context) {
    throw new Error(
      "useKernelWorkshop must be used inside KernelWorkshopProvider",
    );
  }

  return context;
}