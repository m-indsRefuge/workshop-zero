import "./App.css";
import { WorkshopScene } from "./workshop/components/WorkshopScene";
import {
  MockWorkshopProvider,
  useMockWorkshop,
} from "./workshop/mock/MockWorkshopProvider";

function WorkshopApp() {
  const { state, controls, isPaused, scenarioIndex, scenarioLength } =
    useMockWorkshop();

  return (
    <WorkshopScene
      state={state}
      controls={controls}
      isPaused={isPaused}
      scenarioIndex={scenarioIndex}
      scenarioLength={scenarioLength}
    />
  );
}

function App() {
  return (
    <MockWorkshopProvider>
      <WorkshopApp />
    </MockWorkshopProvider>
  );
}

export default App;