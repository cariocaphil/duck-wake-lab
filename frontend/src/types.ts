import sharedRanges from "@shared/wake-parameter-ranges.json";
import { DEFAULT_DUCK_SPECIES, DUCK_SPECIES_PRESETS } from "./duckSpecies";

export interface ParameterRange {
  min: number;
  max: number;
  step: number;
  unit: string;
}

export type PhysicsMode = "kelvin" | "advanced";

export const PHYSICS_MODE_IDS: readonly PhysicsMode[] = ["kelvin", "advanced"];

export const PHYSICS_MODE_LABELS: Record<PhysicsMode, string> = {
  kelvin: "Kelvin (Classic)",
  advanced: "Advanced (Speed-dependent)",
};

export const DEFAULT_PHYSICS_MODE: PhysicsMode = "kelvin";

export function isPhysicsMode(value: string): value is PhysicsMode {
  return PHYSICS_MODE_IDS.some((id) => id === value);
}

/** Educational copy shown for each physics mode. */
export const PHYSICS_MODE_DESCRIPTIONS: Record<PhysicsMode, string> = {
  kelvin:
    "The classical Kelvin wake has a fixed half-angle of approximately 19.47° in ideal deep water.",
  advanced:
    "The Kelvin envelope remains fixed, but the most visible waves may concentrate into a narrower region at higher Froude numbers.",
};

/**
 * Froude number above which the advanced apparent angle drops below the
 * Kelvin angle: 0.5 / tan(asin(1/3)) = sqrt(2). Mirrors the backend
 * `APPARENT_ANGLE_THRESHOLD_FROUDE`; display-only.
 */
export const APPARENT_ANGLE_THRESHOLD_FROUDE = Math.SQRT2;

export interface WakeControlValues {
  duckLengthM: number;
  speedMS: number;
  physicsMode: PhysicsMode;
}

export const PARAMETER_RANGES = {
  duckLengthM: {
    min: sharedRanges.duck_length_m.min,
    max: sharedRanges.duck_length_m.max,
    step: sharedRanges.duck_length_m.step,
    unit: sharedRanges.duck_length_m.unit,
  },
  speedMS: {
    min: sharedRanges.swimming_speed_m_s.min,
    max: sharedRanges.swimming_speed_m_s.max,
    step: sharedRanges.swimming_speed_m_s.step,
    unit: sharedRanges.swimming_speed_m_s.unit,
  },
} as const satisfies Record<"duckLengthM" | "speedMS", ParameterRange>;

export const DEFAULT_CONTROLS: WakeControlValues = {
  duckLengthM: DUCK_SPECIES_PRESETS[DEFAULT_DUCK_SPECIES].defaultLengthM,
  speedMS: 1.2,
  physicsMode: DEFAULT_PHYSICS_MODE,
};

/** Debounce delay before posting wake requests after slider changes. */
export const WAKE_FETCH_DEBOUNCE_MS = 150;
