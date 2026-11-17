import { useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { DuckControls } from "./components/DuckControls";
import { ParameterSummary } from "./components/ParameterSummary";
import { WakeCanvas } from "./components/WakeCanvas";
import { DEFAULT_PARAMETERS, type DuckParameters } from "./types";
import "./App.css";

function App() {
  const [parameters, setParameters] =
    useState<DuckParameters>(DEFAULT_PARAMETERS);

  return (
    <div className="app">
      <AppHeader />

      <main className="app-main">
        <DuckControls parameters={parameters} onChange={setParameters} />
        <WakeCanvas parameters={parameters} />
      </main>

      <ParameterSummary parameters={parameters} />
    </div>
  );
}

export default App;
