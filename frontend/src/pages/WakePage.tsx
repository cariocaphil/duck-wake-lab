import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { ParameterSummary } from "../components/ParameterSummary";
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

      <ParameterSummary values={values} wake={wake} />
    </div>
  );
}
