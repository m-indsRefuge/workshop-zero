import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorldAction, WorldState } from "../kernel/types";
import {
  INITIAL_WORLD_STATE,
  reduceWorld,
} from "../kernel/world";
import type {
  PersistedWorkshop,
  PersistenceSnapshot,
  WorkshopIdentity,
  WorkshopPersistence,
} from "../persistence/types";
import { tauriWorkshopPersistence } from "../persistence/tauriPersistence";
import {
  createBeingContext,
} from "../perception/perceive";
import type {
  BeingContext,
  HistoricalGeneratorObservation,
} from "../perception/types";
import type { WorkshopPlaybackControls } from "../playback";
import type {
  WorkshopAttentionTarget,
  WorkshopPhase,
  WorkshopViewState,
} from "../types";
import { DEVELOPMENT_PROBE } from "./developmentProbe";


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
  identity: WorkshopIdentity | null;
  beingContext: BeingContext | null;
  isReady: boolean;
  persistenceError: string | null;
}

interface KernelWorkshopProviderProps extends PropsWithChildren {
  persistence?: WorkshopPersistence;
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
  persistenceError: string | null,
): WorkshopPhase {
  if (persistenceError !== null) {
    return "error";
  }

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
  persistenceError: string | null,
): WorkshopViewState {
  const lampOn = runtime.world.lampSwitch === "on";

  return {
    phase: phaseForAction(
      runtime.lastAction,
      isPaused,
      persistenceError,
    ),
    lamp: {
      switchedOn: lampOn,
      lit: lampOn && runtime.world.charge > 0,
    },
    generator: {
      visibleReading: runtime.generator.visibleReading,
      readingTick: runtime.generator.readingTick,
    },
    being: {
      activity:
        persistenceError === null ? null : "persistence unavailable",
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

function toPersistenceSnapshot(
  runtime: KernelRuntimeState,
): PersistenceSnapshot {
  return {
    world: {
      tick: runtime.world.tick,
      charge: runtime.world.charge,
      lampSwitch: runtime.world.lampSwitch,
    },
    generator: {
      visibleReading: runtime.generator.visibleReading,
      readingTick: runtime.generator.readingTick,
    },
    probeIndex: runtime.probeIndex,
  };
}

function fromPersistedWorkshop(
  persisted: PersistedWorkshop,
): KernelRuntimeState {
  const { snapshot } = persisted;

  if (
    snapshot.probeIndex < 0 ||
    snapshot.probeIndex > DEVELOPMENT_PROBE.length
  ) {
    throw new Error("persisted probe index is outside V0 bounds");
  }

  if (snapshot.world.tick < 0) {
    throw new Error("persisted world tick is invalid");
  }

  if (snapshot.world.charge < 0 || snapshot.world.charge > 12) {
    throw new Error("persisted world charge is invalid");
  }

  return {
    world: {
      tick: snapshot.world.tick,
      charge: snapshot.world.charge,
      lampSwitch: snapshot.world.lampSwitch,
    },
    lastAction: null,
    generator: {
      visibleReading: snapshot.generator.visibleReading,
      readingTick: snapshot.generator.readingTick,
    },
    probeIndex: snapshot.probeIndex,
  };
}

function persistenceMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function KernelWorkshopProvider({
  children,
  persistence = tauriWorkshopPersistence,
}: KernelWorkshopProviderProps) {
  const [runtime, setRuntime] =
    useState<KernelRuntimeState>(initialRuntime);
  const [identity, setIdentity] =
    useState<WorkshopIdentity | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [persistenceError, setPersistenceError] =
    useState<string | null>(null);

  const runtimeRef = useRef(runtime);
  const readyRef = useRef(false);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    persistence
      .loadOrInitialize()
      .then((persisted) => {
        if (cancelled) {
          return;
        }

        const restored = fromPersistedWorkshop(persisted);
        runtimeRef.current = restored;
        readyRef.current = true;
        setRuntime(restored);
        setIdentity(persisted.identity);
        setIsPaused(true);
        setPersistenceError(null);
        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        readyRef.current = false;
        setIsPaused(true);
        setPersistenceError(persistenceMessage(error));
        setIsReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [persistence]);

  const enqueueRuntimeChange = useCallback(
    (
      transform: (
        current: KernelRuntimeState,
      ) => KernelRuntimeState,
    ) => {
      operationQueueRef.current = operationQueueRef.current
        .then(async () => {
          if (!readyRef.current) {
            return;
          }

          const current = runtimeRef.current;
          const next = transform(current);

          if (next === current) {
            return;
          }

          await persistence.saveSnapshot(
            toPersistenceSnapshot(next),
          );

          runtimeRef.current = next;
          setRuntime(next);
        })
        .catch((error: unknown) => {
          readyRef.current = false;
          setIsPaused(true);
          setIsReady(false);
          setPersistenceError(persistenceMessage(error));
        });
    },
    [persistence],
  );

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (readyRef.current) {
      setIsPaused(false);
    }
  }, []);

  const step = useCallback(() => {
    enqueueRuntimeChange(advanceRuntime);
  }, [enqueueRuntimeChange]);

  const reset = useCallback(() => {
    enqueueRuntimeChange(() => initialRuntime());
    setIsPaused(true);
  }, [enqueueRuntimeChange]);

  useEffect(() => {
    if (
      !isPaused &&
      runtime.probeIndex >= DEVELOPMENT_PROBE.length
    ) {
      setIsPaused(true);
    }
  }, [isPaused, runtime.probeIndex]);

  useEffect(() => {
    if (
      !isReady ||
      isPaused ||
      runtime.probeIndex >= DEVELOPMENT_PROBE.length
    ) {
      return;
    }

    const handle = window.setInterval(() => {
      enqueueRuntimeChange(advanceRuntime);
    }, PROBE_INTERVAL_MS);

    return () => {
      window.clearInterval(handle);
    };
  }, [
    enqueueRuntimeChange,
    isPaused,
    isReady,
    runtime.probeIndex,
  ]);

  const state = useMemo(
    () => projectView(runtime, isPaused, persistenceError),
    [isPaused, persistenceError, runtime],
  );
  const beingContext = useMemo<BeingContext | null>(() => {
    if (identity === null || !isReady) {
      return null;
    }

    return createBeingContext(
      identity,
      runtime.world,
      runtime.generator,
    );
  }, [identity, isReady, runtime.generator, runtime.world]);

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
      identity,
      beingContext,
      isReady,
      persistenceError,
    }),
    [
      beingContext,
      controls,
      identity,
      isPaused,
      isReady,
      persistenceError,
      runtime.probeIndex,
      state,
    ],
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