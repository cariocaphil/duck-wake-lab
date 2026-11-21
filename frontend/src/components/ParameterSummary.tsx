import type { WakeResponse } from "../api/wakeClient";
import { DUCK_SPECIES_PRESETS, type DuckSpecies } from "../duckSpecies";
import type { WakeControlValues } from "../types";

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
  return (
    <aside className="parameter-summary" aria-label="Selected parameters">
      <h2>Selected parameters</h2>
      <dl>
        <div>
          <dt>Duck species</dt>
          <dd data-testid="param-species">
            {DUCK_SPECIES_PRESETS[species].label}
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
          </>
        )}
      </dl>
    </aside>
  );
}
