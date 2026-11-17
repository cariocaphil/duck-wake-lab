import type { DuckParameters } from "../types";
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
        unit="m"
        value={parameters.bodyLength}
        min={0.2}
        max={1.0}
        step={0.01}
        onChange={(bodyLength) => update("bodyLength", bodyLength)}
      />

      <RangeField
        label="Swimming speed"
        unit="m/s"
        value={parameters.speed}
        min={0.1}
        max={2.0}
        step={0.01}
        onChange={(speed) => update("speed", speed)}
      />

      <PhysicsLevelField
        value={parameters.physicsLevel}
        onChange={(physicsLevel) => update("physicsLevel", physicsLevel)}
      />
    </section>
  );
}
