import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { WakeControls } from "../components/WakeControls";
import { WakeVisualization } from "../components/WakeVisualization";
import { useWakeQuery } from "../hooks/useWakeQuery";
import { DEFAULT_CONTROLS, type WakeControlValues } from "../types";

export function WakePage() {
  const [values, setValues] = useState<WakeControlValues>(DEFAULT_CONTROLS);
  const { wake, loading, error } = useWakeQuery(values);

  return (
    <div className="app">
      <AppHeader />

      <main className="app-main">
        <WakeControls values={values} onChange={setValues} />
        <WakeVisualization wake={wake} loading={loading} error={error} />
      </main>

      <aside className="parameter-summary" aria-label="Selected parameters">
        <h2>Selected parameters</h2>
        <dl>
          <div>
            <dt>Duck length</dt>
            <dd data-testid="param-body-length">
              {values.duckLengthM.toFixed(2)} m
            </dd>
          </div>
          <div>
            <dt>Swimming speed</dt>
            <dd data-testid="param-speed">{values.speedMS.toFixed(2)} m/s</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
