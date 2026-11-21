import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { ParameterSummary } from "../components/ParameterSummary";
import { WakeControls } from "../components/WakeControls";
import { WakeVisualization } from "../components/WakeVisualization";
import {
  DEFAULT_DUCK_SPECIES,
  DUCK_SPECIES_PRESETS,
  type DuckSpecies,
} from "../duckSpecies";
import { useWakeQuery } from "../hooks/useWakeQuery";
import { DEFAULT_CONTROLS, type WakeControlValues } from "../types";

export function WakePage() {
  const [species, setSpecies] = useState<DuckSpecies>(DEFAULT_DUCK_SPECIES);
  const [values, setValues] = useState<WakeControlValues>(DEFAULT_CONTROLS);
  const { wake, loading, error } = useWakeQuery(values);

  // Selecting a species always reapplies its default length; speed is preserved.
  function handleSpeciesChange(next: DuckSpecies): void {
    setSpecies(next);
    setValues((current) => ({
      ...current,
      duckLengthM: DUCK_SPECIES_PRESETS[next].defaultLengthM,
    }));
  }

  return (
    <div className="app">
      <AppHeader />

      <main className="app-main">
        <WakeControls
          species={species}
          values={values}
          onSpeciesChange={handleSpeciesChange}
          onChange={setValues}
        />
        <WakeVisualization wake={wake} loading={loading} error={error} />
      </main>

      <ParameterSummary species={species} values={values} wake={wake} />
    </div>
  );
}
