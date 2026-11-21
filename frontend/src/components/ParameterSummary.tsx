import type { WakeResponse } from "../api/wakeClient";
import {
  DUCK_SPECIES_PRESETS,
  isCustomLength,
  type DuckSpecies,
} from "../duckSpecies";
import {
  APPARENT_ANGLE_THRESHOLD_FROUDE,
  PHYSICS_MODE_LABELS,
  type WakeControlValues,
} from "../types";

interface ParameterSummaryProps {
  species: DuckSpecies;
  values: WakeControlValues;
  wake: WakeResponse | null;
}

export function ParameterSummary({
  species,
  values,
  wake,
}: ParameterSummaryProps) {
  const customLength = isCustomLength(species, values.duckLengthM);
  const advancedWake = wake?.physics_mode === "advanced" ? wake : null;
  const apparentEqualsKelvin =
    advancedWake !== null &&
    advancedWake.froude_number <= APPARENT_ANGLE_THRESHOLD_FROUDE;

  return (
    <aside className="parameter-summary" aria-label="Selected parameters">
      <h2>Selected parameters</h2>
      <dl>
        <div>
          <dt>Duck species</dt>
          <dd data-testid="param-species">
            {DUCK_SPECIES_PRESETS[species].label}
            {customLength && " (custom length)"}
          </dd>
        </div>
        <div>
          <dt>Duck length</dt>
          <dd data-testid="param-body-length">
            {values.duckLengthM.toFixed(2)} m
          </dd>
        </div>
        <div>
          <dt>Swimming speed</dt>
          <dd data-testid="param-speed">{values.speedMS.toFixed(2)} m/s</dd>
        </div>
        <div>
          <dt>Physics mode</dt>
          <dd data-testid="param-physics-mode">
            {PHYSICS_MODE_LABELS[values.physicsMode]}
          </dd>
        </div>
        {wake !== null && (
          <>
            <div>
              <dt>Froude number</dt>
              <dd data-testid="wake-froude">{wake.froude_number.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Kelvin half-angle</dt>
              <dd data-testid="wake-half-angle">
                {wake.kelvin_angle_deg.toFixed(2)}°
              </dd>
            </div>
            {advancedWake !== null && (
              <div>
                <dt>Apparent half-angle</dt>
                <dd data-testid="wake-apparent-angle">
                  {advancedWake.apparent_angle_deg.toFixed(2)}°
                </dd>
              </div>
            )}
          </>
        )}
      </dl>
      {apparentEqualsKelvin && (
        <p className="summary-note" data-testid="apparent-equals-kelvin-note">
          The apparent wake only narrows when Fr &gt;{" "}
          {APPARENT_ANGLE_THRESHOLD_FROUDE.toFixed(2)}; below that it matches
          the Kelvin envelope.
        </p>
      )}
    </aside>
  );
}
