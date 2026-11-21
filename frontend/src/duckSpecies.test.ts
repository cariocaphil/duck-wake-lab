import { describe, expect, it } from "vitest";
import {
  DEFAULT_DUCK_SPECIES,
  DUCK_SPECIES_IDS,
  DUCK_SPECIES_PRESETS,
  isCustomLength,
  isDuckSpecies,
} from "./duckSpecies";
import { PARAMETER_RANGES } from "./types";

describe("duck species presets", () => {
  it("defines Teal, Mallard and Muscovy default lengths", () => {
    expect(DUCK_SPECIES_PRESETS.teal).toEqual({
      label: "Teal",
      defaultLengthM: 0.35,
    });
    expect(DUCK_SPECIES_PRESETS.mallard).toEqual({
      label: "Mallard",
      defaultLengthM: 0.55,
    });
    expect(DUCK_SPECIES_PRESETS.muscovy).toEqual({
      label: "Muscovy",
      defaultLengthM: 0.75,
    });
    expect(DUCK_SPECIES_IDS).toEqual(["teal", "mallard", "muscovy"]);
  });

  it("uses Mallard as the default species", () => {
    expect(DEFAULT_DUCK_SPECIES).toBe("mallard");
  });

  it("keeps every preset length within the length slider range", () => {
    for (const id of DUCK_SPECIES_IDS) {
      const { defaultLengthM } = DUCK_SPECIES_PRESETS[id];
      expect(defaultLengthM).toBeGreaterThanOrEqual(
        PARAMETER_RANGES.duckLengthM.min,
      );
      expect(defaultLengthM).toBeLessThanOrEqual(
        PARAMETER_RANGES.duckLengthM.max,
      );
    }
  });

  it("recognises only known species ids", () => {
    expect(isDuckSpecies("teal")).toBe(true);
    expect(isDuckSpecies("goose")).toBe(false);
    expect(isDuckSpecies("toString")).toBe(false);
  });

  it("detects a custom length relative to the species preset", () => {
    expect(isCustomLength("mallard", 0.55)).toBe(false);
    expect(isCustomLength("mallard", 0.9)).toBe(true);
    expect(isCustomLength("teal", 0.55)).toBe(true);
    // Float noise below the 0.01 m slider step is not "custom".
    expect(isCustomLength("mallard", 0.55 + 1e-9)).toBe(false);
    expect(isCustomLength("mallard", 0.56)).toBe(true);
  });
});
