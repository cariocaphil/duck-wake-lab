import { PHYSICS_LEVEL_LABELS, type PhysicsLevel } from "../types";

interface PhysicsLevelOption {
  level: PhysicsLevel;
  enabled: boolean;
}

// The advanced level stays disabled until it lands in a future PR.
// Flipping `enabled` to true is all that is needed to turn it on.
const PHYSICS_LEVEL_OPTIONS: readonly PhysicsLevelOption[] = [
  { level: "kelvin", enabled: true },
  { level: "advanced", enabled: false },
];

interface PhysicsLevelFieldProps {
  value: PhysicsLevel;
  onChange: (level: PhysicsLevel) => void;
}

export function PhysicsLevelField({ value, onChange }: PhysicsLevelFieldProps) {
  return (
    <fieldset className="control-field physics-level">
      <legend>Physics level</legend>
      {PHYSICS_LEVEL_OPTIONS.map(({ level, enabled }) => (
        <label key={level} className={enabled ? undefined : "coming-soon"}>
          <input
            type="radio"
            name="physicsLevel"
            value={level}
            disabled={!enabled}
            checked={value === level}
            onChange={() => onChange(level)}
          />
          {PHYSICS_LEVEL_LABELS[level]}
          {enabled ? null : " (coming soon)"}
        </label>
      ))}
    </fieldset>
  );
}
