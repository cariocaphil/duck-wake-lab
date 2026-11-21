export interface DuckSpeciesPreset {
  label: string;
  /** Illustrative default body length in meters (not an authoritative measurement). */
  defaultLengthM: number;
}

/**
 * Educational body-length presets. Values are approximate and only supply a
 * default length; they do not change any hydrodynamic formula.
 */
export const DUCK_SPECIES_PRESETS = {
  teal: { label: "Teal", defaultLengthM: 0.35 },
  mallard: { label: "Mallard", defaultLengthM: 0.55 },
  muscovy: { label: "Muscovy", defaultLengthM: 0.75 },
} as const satisfies Record<string, DuckSpeciesPreset>;

export type DuckSpecies = keyof typeof DUCK_SPECIES_PRESETS;

export const DUCK_SPECIES_IDS = Object.keys(DUCK_SPECIES_PRESETS) as DuckSpecies[];

export const DEFAULT_DUCK_SPECIES: DuckSpecies = "mallard";

export function isDuckSpecies(value: string): value is DuckSpecies {
  return DUCK_SPECIES_IDS.some((id) => id === value);
}
