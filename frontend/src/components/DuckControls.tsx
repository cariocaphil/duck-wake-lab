import { PARAMETER_RANGES, type DuckParameters } from "../types";
import { PhysicsLevelField } from "./PhysicsLevelField";
import { RangeField } from "./RangeField";
import { SpeciesSelect } from "./SpeciesSelect";

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

      <SpeciesSelect
        value={parameters.species}
        onChange={(species) => update("species", species)}
      />

      <RangeField
        label="Body length"
        value={parameters.bodyLength}
        {...PARAMETER_RANGES.bodyLength}
        onChange={(bodyLength) => update("bodyLength", bodyLength)}
      />

      <RangeField
        label="Swimming speed"
        value={parameters.speed}
        {...PARAMETER_RANGES.speed}
        onChange={(speed) => update("speed", speed)}
      />

      <PhysicsLevelField
        value={parameters.physicsLevel}
        onChange={(physicsLevel) => update("physicsLevel", physicsLevel)}
      />
    </section>
  );
}
