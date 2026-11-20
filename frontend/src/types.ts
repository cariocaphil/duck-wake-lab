export interface ParameterRange {
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface WakeControlValues {
  duckLengthM: number;
  speedMS: number;
}

export const PARAMETER_RANGES = {
  duckLengthM: { min: 0.2, max: 1.0, step: 0.01, unit: "m" },
  speedMS: { min: 0.1, max: 3.0, step: 0.01, unit: "m/s" },
} as const satisfies Record<"duckLengthM" | "speedMS", ParameterRange>;

export const DEFAULT_CONTROLS: WakeControlValues = {
  duckLengthM: 0.5,
  speedMS: 1.2,
};

/** Debounce delay before posting wake requests after slider changes. */
export const WAKE_FETCH_DEBOUNCE_MS = 150;
