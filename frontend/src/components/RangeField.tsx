interface RangeFieldProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function RangeField({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: RangeFieldProps) {
  return (
    <label className="control-field">
      <span>
        {label} ({value.toFixed(2)} {unit})
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
      />
    </label>
  );
}
