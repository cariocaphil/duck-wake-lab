import sharedRanges from "@shared/wake-parameter-ranges.json";

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
  duckLengthM: {
    min: sharedRanges.duck_length_m.min,
    max: sharedRanges.duck_length_m.max,
    step: sharedRanges.duck_length_m.step,
    unit: sharedRanges.duck_length_m.unit,
  },
  speedMS: {
    min: sharedRanges.speed_m_s.min,
    max: sharedRanges.speed_m_s.max,
    step: sharedRanges.speed_m_s.step,
    unit: sharedRanges.speed_m_s.unit,
  },
} as const satisfies Record<"duckLengthM" | "speedMS", ParameterRange>;

export const DEFAULT_CONTROLS: WakeControlValues = {
  duckLengthM: 0.5,
  speedMS: 1.2,
};

/** Debounce delay before posting wake requests after slider changes. */
export const WAKE_FETCH_DEBOUNCE_MS = 150;
