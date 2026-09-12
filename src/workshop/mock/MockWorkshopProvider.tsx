import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WorkshopViewState } from "../types";
import {
  getNextScenarioIndex,
  getScenarioState,
  workshopMockScenario,
} from "./scenario";

import type { WorkshopPlaybackControls } from "../playback";
export type { WorkshopPlaybackControls } from "../playback";

interface MockWorkshopContextValue {
  state: WorkshopViewState;
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  scenarioIndex: number;
  scenarioLength: number;
}

const MockWorkshopContext = createContext<MockWorkshopContextValue | null>(null);
const DEMO_INTERVAL_MS = 1600;

export function MockWorkshopProvider({ children }: PropsWithChildren) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const step = useCallback(
    () => setScenarioIndex((current) => getNextScenarioIndex(current)),
    [],
  );
  const reset = useCallback(() => {
    setScenarioIndex(0);
    setIsPaused(true);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const handle = window.setInterval(() => {
      setScenarioIndex((current) => {
        const next = getNextScenarioIndex(current);
        if (next === current) setIsPaused(true);
        return next;
      });
    }, DEMO_INTERVAL_MS);

    return () => window.clearInterval(handle);
  }, [isPaused]);

  const scenarioState = getScenarioState(scenarioIndex);

  const state = useMemo<WorkshopViewState>(() => {
    if (!isPaused || scenarioState.phase === "paused") return scenarioState;

    return {
      ...scenarioState,
      phase: "paused",
      being: {
        ...scenarioState.being,
        activity: "paused",
      },
    };
  }, [isPaused, scenarioState]);

  const controls = useMemo(
    () => ({ pause, resume, step, reset }),
    [pause, reset, resume, step],
  );

  const value = useMemo(
    () => ({
      state,
      controls,
      isPaused,
      scenarioIndex,
      scenarioLength: workshopMockScenario.length,
    }),
    [controls, isPaused, scenarioIndex, state],
  );

  return (
    <MockWorkshopContext.Provider value={value}>
      {children}
    </MockWorkshopContext.Provider>
  );
}

export function useMockWorkshop(): MockWorkshopContextValue {
  const context = useContext(MockWorkshopContext);
  if (!context) {
    throw new Error("useMockWorkshop must be used inside MockWorkshopProvider");
  }
  return context;
}