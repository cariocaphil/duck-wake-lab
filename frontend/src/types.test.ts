import { describe, expect, it } from "vitest";
import sharedRanges from "@shared/wake-parameter-ranges.json";
import { PARAMETER_RANGES } from "./types";

describe("PARAMETER_RANGES", () => {
  it("matches shared/wake-parameter-ranges.json", () => {
    expect(PARAMETER_RANGES.duckLengthM).toEqual(sharedRanges.duck_length_m);
    expect(PARAMETER_RANGES.speedMS).toEqual(sharedRanges.swimming_speed_m_s);
  });
});
