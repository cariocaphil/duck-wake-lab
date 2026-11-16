export type DuckSpecies = "Mallard" | "Teal" | "Muscovy";

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

export const DUCK_SPECIES: readonly DuckSpecies[] = [
  "Mallard",
  "Teal",
  "Muscovy",
] as const;

export const DEFAULT_PARAMETERS: DuckParameters = {
  species: "Mallard",
  bodyLength: 0.5,
  speed: 0.7,
  physicsLevel: "kelvin",
};
