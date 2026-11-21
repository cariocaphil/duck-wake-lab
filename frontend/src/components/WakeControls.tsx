import { RangeField } from "./RangeField";
import {
  DUCK_SPECIES_IDS,
  DUCK_SPECIES_PRESETS,
  isDuckSpecies,
  type DuckSpecies,
} from "../duckSpecies";
import { PARAMETER_RANGES, type WakeControlValues } from "../types";

interface WakeControlsProps {
  species: DuckSpecies;
  values: WakeControlValues;
  onSpeciesChange: (species: DuckSpecies) => void;
  onChange: (values: WakeControlValues) => void;
}

export function WakeControls({
  species,
  values,
  onSpeciesChange,
  onChange,
}: WakeControlsProps) {
  function update<K extends keyof WakeControlValues>(
    key: K,
    value: WakeControlValues[K],
  ): void {
    onChange({ ...values, [key]: value });
  }

  return (
    <section className="controls" aria-label="Duck controls">
      <h2>Controls</h2>
      <label className="control-field">
        <span>Duck species</span>
        <select
          aria-label="Duck species"
          value={species}
          onChange={(event) => {
            const next = event.target.value;
            if (isDuckSpecies(next)) {
              onSpeciesChange(next);
            }
          }}
        >
          {DUCK_SPECIES_IDS.map((id) => (
            <option key={id} value={id}>
              {DUCK_SPECIES_PRESETS[id].label}
            </option>
          ))}
        </select>
      </label>
      <RangeField
        label="Duck length"
        {...PARAMETER_RANGES.duckLengthM}
        value={values.duckLengthM}
        onChange={(value) => update("duckLengthM", value)}
      />
      <RangeField
        label="Swimming speed"
        {...PARAMETER_RANGES.speedMS}
        value={values.speedMS}
        onChange={(value) => update("speedMS", value)}
      />
    </section>
  );
}
