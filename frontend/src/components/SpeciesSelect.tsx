import { DUCK_SPECIES, isDuckSpecies, type DuckSpecies } from "../types";

interface SpeciesSelectProps {
  value: DuckSpecies;
  onChange: (species: DuckSpecies) => void;
}

export function SpeciesSelect({ value, onChange }: SpeciesSelectProps) {
  return (
    <label className="control-field">
      <span>Duck species</span>
      <select
        aria-label="Duck species"
        value={value}
        onChange={(event) => {
          const selected = event.target.value;
          if (isDuckSpecies(selected)) {
            onChange(selected);
          }
        }}
      >
        {DUCK_SPECIES.map((species) => (
          <option key={species} value={species}>
            {species}
          </option>
        ))}
      </select>
    </label>
  );
}
