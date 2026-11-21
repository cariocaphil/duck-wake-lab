import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { ParameterSummary } from "../components/ParameterSummary";
import { WakeControls } from "../components/WakeControls";
import { WakeVisualization } from "../components/WakeVisualization";
import { WaveVisualization } from "../components/WaveVisualization";
import {
  DEFAULT_DUCK_SPECIES,
  DUCK_SPECIES_PRESETS,
  type DuckSpecies,
} from "../duckSpecies";
import { useWakeQuery } from "../hooks/useWakeQuery";
import { useWaveFieldQuery } from "../hooks/useWaveFieldQuery";
import { DEFAULT_CONTROLS, type WakeControlValues } from "../types";

export function WakePage() {
  const [species, setSpecies] = useState<DuckSpecies>(DEFAULT_DUCK_SPECIES);
  const [values, setValues] = useState<WakeControlValues>(DEFAULT_CONTROLS);
  const { wake, loading, error } = useWakeQuery(values);
  // The wave field depends only on length and speed (not physics mode).
  const wave = useWaveFieldQuery({
    duckLengthM: values.duckLengthM,
    speedMS: values.speedMS,
  });

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

      <WaveVisualization
        waveField={wave.waveField}
        loading={wave.loading}
        error={wave.error}
      />

      <ParameterSummary species={species} values={values} wake={wake} />
    </div>
  );
}
