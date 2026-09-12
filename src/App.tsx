import "./App.css";
import { WorkshopScene } from "./workshop/components/WorkshopScene";
import {
  KernelWorkshopProvider,
  useKernelWorkshop,
} from "./workshop/runtime/KernelWorkshopProvider";

function WorkshopApp() {
  const {
    state,
    controls,
    isPaused,
    probeIndex,
    probeLength,
  } = useKernelWorkshop();

  return (
    <WorkshopScene
      state={state}
      controls={controls}
      isPaused={isPaused}
      playbackStatus={`kernel ${probeIndex}/${probeLength}`}
    />
  );
}

function App() {
  return (
    <KernelWorkshopProvider>
      <WorkshopApp />
    </KernelWorkshopProvider>
  );
}

export default App;