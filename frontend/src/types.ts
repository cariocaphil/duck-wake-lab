export const DUCK_SPECIES = ["Mallard", "Teal", "Muscovy"] as const;

export type DuckSpecies = (typeof DUCK_SPECIES)[number];

export function isDuckSpecies(value: string): value is DuckSpecies {
  return (DUCK_SPECIES as readonly string[]).includes(value);
}

export type PhysicsLevel = "kelvin" | "advanced";

export const PHYSICS_LEVEL_LABELS: Record<PhysicsLevel, string> = {
  kelvin: "Kelvin",
  advanced: "Advanced",
};

export interface DuckParameters {
  species: DuckSpecies;
  bodyLength: number;
  speed: number;
  physicsLevel: PhysicsLevel;
}

export interface ParameterRange {
  min: number;
  max: number;
  step: number;
  unit: string;
}

export const PARAMETER_RANGES = {
  bodyLength: { min: 0.2, max: 1.0, step: 0.01, unit: "m" },
  speed: { min: 0.1, max: 2.0, step: 0.01, unit: "m/s" },
} as const satisfies Record<"bodyLength" | "speed", ParameterRange>;

export const DEFAULT_PARAMETERS: DuckParameters = {
  species: "Mallard",
  bodyLength: 0.5,
  speed: 0.7,
  physicsLevel: "kelvin",
};
