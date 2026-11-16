import { useState } from "react";
import { DuckControls } from "./components/DuckControls";
import { WakeCanvas } from "./components/WakeCanvas";
import { DEFAULT_PARAMETERS, type DuckParameters } from "./types";
import "./App.css";

function App() {
  const [parameters, setParameters] =
    useState<DuckParameters>(DEFAULT_PARAMETERS);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Duck Wake Lab</h1>
        <p className="subtitle">
          Explore the physics behind a swimming duck&apos;s wake.
        </p>
      </header>

      <main className="app-main">
        <DuckControls parameters={parameters} onChange={setParameters} />
        <WakeCanvas parameters={parameters} />
      </main>

      <aside className="parameter-summary" aria-label="Selected parameters">
        <h2>Selected parameters</h2>
        <dl>
          <div>
            <dt>Species</dt>
            <dd data-testid="param-species">{parameters.species}</dd>
          </div>
          <div>
            <dt>Body length</dt>
            <dd data-testid="param-body-length">
              {parameters.bodyLength.toFixed(2)} m
            </dd>
          </div>
          <div>
            <dt>Swimming speed</dt>
            <dd data-testid="param-speed">{parameters.speed.toFixed(2)} m/s</dd>
          </div>
          <div>
            <dt>Physics level</dt>
            <dd data-testid="param-physics">
              {parameters.physicsLevel === "kelvin" ? "Kelvin" : "Advanced"}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

export default App;
