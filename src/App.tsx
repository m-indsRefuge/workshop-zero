import "./App.css";
import { WorkshopScene } from "./workshop/components/WorkshopScene";
import type { WorkshopPersistence } from "./workshop/persistence/types";
import {
  KernelWorkshopProvider,
  useKernelWorkshop,
} from "./workshop/runtime/KernelWorkshopProvider";

interface WorkshopApplicationProps {
  persistence?: WorkshopPersistence;
}

function WorkshopApp() {
  const {
    state,
    controls,
    isPaused,
    probeIndex,
    probeLength,
    isReady,
    persistenceError,
  } = useKernelWorkshop();

  const playbackStatus =
    persistenceError !== null
      ? "persistence error"
      : isReady
        ? `kernel ${probeIndex}/${probeLength}`
        : "loading";

  return (
    <WorkshopScene
      state={state}
      controls={controls}
      isPaused={isPaused}
      playbackStatus={playbackStatus}
    />
  );
}

export function WorkshopApplication({
  persistence,
}: WorkshopApplicationProps) {
  return (
    <KernelWorkshopProvider persistence={persistence}>
      <WorkshopApp />
    </KernelWorkshopProvider>
  );
}

function App() {
  return <WorkshopApplication />;
}

export default App;