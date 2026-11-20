import { RangeField } from "./RangeField";
import { PARAMETER_RANGES, type WakeControlValues } from "../types";

interface WakeControlsProps {
  values: WakeControlValues;
  onChange: (values: WakeControlValues) => void;
}

export function WakeControls({ values, onChange }: WakeControlsProps) {
  function update<K extends keyof WakeControlValues>(
    key: K,
    value: WakeControlValues[K],
  ): void {
    onChange({ ...values, [key]: value });
  }

  return (
    <section className="controls" aria-label="Duck controls">
      <h2>Controls</h2>
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
