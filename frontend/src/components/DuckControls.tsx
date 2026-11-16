import type { DuckParameters, DuckSpecies, PhysicsLevel } from "../types";
import { DUCK_SPECIES } from "../types";

interface DuckControlsProps {
  parameters: DuckParameters;
  onChange: (parameters: DuckParameters) => void;
}

export function DuckControls({ parameters, onChange }: DuckControlsProps) {
  function update<K extends keyof DuckParameters>(
    key: K,
    value: DuckParameters[K],
  ): void {
    onChange({ ...parameters, [key]: value });
  }

  return (
    <section className="controls" aria-label="Duck controls">
      <h2>Controls</h2>

      <label className="control-field">
        <span>Duck species</span>
        <select
          aria-label="Duck species"
          value={parameters.species}
          onChange={(event) =>
            update("species", event.target.value as DuckSpecies)
          }
        >
          {DUCK_SPECIES.map((species) => (
            <option key={species} value={species}>
              {species}
            </option>
          ))}
        </select>
      </label>

      <label className="control-field">
        <span>Body length ({parameters.bodyLength.toFixed(2)} m)</span>
        <input
          type="range"
          aria-label="Body length"
          min={0.2}
          max={1.0}
          step={0.01}
          value={parameters.bodyLength}
          onChange={(event) =>
            update("bodyLength", Number.parseFloat(event.target.value))
          }
        />
      </label>

      <label className="control-field">
        <span>Swimming speed ({parameters.speed.toFixed(2)} m/s)</span>
        <input
          type="range"
          aria-label="Swimming speed"
          min={0.1}
          max={2.0}
          step={0.01}
          value={parameters.speed}
          onChange={(event) =>
            update("speed", Number.parseFloat(event.target.value))
          }
        />
      </label>

      <fieldset className="control-field physics-level">
        <legend>Physics level</legend>
        <label>
          <input
            type="radio"
            name="physicsLevel"
            value="kelvin"
            checked={parameters.physicsLevel === "kelvin"}
            onChange={() => update("physicsLevel", "kelvin" as PhysicsLevel)}
          />
          Kelvin
        </label>
        <label className="coming-soon">
          <input
            type="radio"
            name="physicsLevel"
            value="advanced"
            disabled
            checked={parameters.physicsLevel === "advanced"}
            onChange={() => update("physicsLevel", "advanced" as PhysicsLevel)}
          />
          Advanced (coming soon)
        </label>
      </fieldset>
    </section>
  );
}
