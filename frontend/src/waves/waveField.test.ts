import { describe, expect, it } from "vitest";
import { makeWaveFieldResponse } from "../test/wakeFixtures";
import {
  CREST_RGB,
  NEUTRAL_RGB,
  TROUGH_RGB,
  WAVE_FAMILY_IDS,
  WAVE_FAMILY_LABELS,
  displacementToRgba,
  fieldScale,
  fillRgba,
  isWaveFamily,
  kelvinBoundaries,
  selectField,
  waveViewBox,
} from "./waveField";

describe("wave families", () => {
  it("offers Transverse, Divergent and Both", () => {
    expect(WAVE_FAMILY_IDS).toEqual(["transverse", "divergent", "both"]);
    expect(WAVE_FAMILY_IDS.map((id) => WAVE_FAMILY_LABELS[id])).toEqual([
      "Transverse",
      "Divergent",
      "Both",
    ]);
    expect(isWaveFamily("both")).toBe(true);
    expect(isWaveFamily("combined")).toBe(false);
  });

  it("selectField returns the matching grid ('both' is the combined field)", () => {
    const wave = makeWaveFieldResponse();
    expect(selectField(wave, "transverse")).toBe(wave.transverse);
    expect(selectField(wave, "divergent")).toBe(wave.divergent);
    expect(selectField(wave, "both")).toBe(wave.combined);
  });
});

describe("fieldScale", () => {
  it("is the largest absolute value over all three fields", () => {
    const wave = makeWaveFieldResponse();
    // Combined peak is 1.0 + 0.2 = 1.2, larger than either component.
    expect(fieldScale(wave)).toBeCloseTo(1.2, 10);
  });

  it("does not depend on which family is selected", () => {
    const wave = makeWaveFieldResponse();
    const scales = WAVE_FAMILY_IDS.map(() => fieldScale(wave));
    expect(new Set(scales).size).toBe(1);
  });

  it("falls back to 1 for an all-zero field", () => {
    const zeros = [
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    expect(
      fieldScale(
        makeWaveFieldResponse({
          transverse: zeros,
          divergent: zeros,
          combined: zeros,
        }),
      ),
    ).toBe(1);
  });
});

describe("displacementToRgba", () => {
  it("maps zero to neutral, +scale to crest and -scale to trough", () => {
    expect(displacementToRgba(0, 2)).toEqual([...NEUTRAL_RGB, 255]);
    expect(displacementToRgba(2, 2)).toEqual([...CREST_RGB, 255]);
    expect(displacementToRgba(-2, 2)).toEqual([...TROUGH_RGB, 255]);
  });

  it("clamps values beyond the scale", () => {
    expect(displacementToRgba(10, 2)).toEqual(displacementToRgba(2, 2));
    expect(displacementToRgba(-10, 2)).toEqual(displacementToRgba(-2, 2));
  });

  it("renders a weak value paler than a strong one on the same scale", () => {
    const weak = displacementToRgba(0.3, 1.2);
    const strong = displacementToRgba(1.2, 1.2);
    // Distance from the neutral color grows with displacement.
    const distance = (c: number[]) =>
      Math.abs((c[0] ?? 0) - NEUTRAL_RGB[0]) +
      Math.abs((c[1] ?? 0) - NEUTRAL_RGB[1]) +
      Math.abs((c[2] ?? 0) - NEUTRAL_RGB[2]);
    expect(distance(weak)).toBeGreaterThan(0);
    expect(distance(weak)).toBeLessThan(distance(strong));
  });
});

describe("fillRgba", () => {
  it("flips rows so physics +y is at the top of the canvas", () => {
    const field = [
      [-1, -1], // lowest y -> bottom canvas row
      [1, 1], // highest y -> top canvas row
    ];
    const data = new Uint8ClampedArray(2 * 2 * 4);
    fillRgba(data, field, 1);
    expect(Array.from(data.slice(0, 4))).toEqual([...CREST_RGB, 255]);
    expect(Array.from(data.slice(8, 12))).toEqual([...TROUGH_RGB, 255]);
  });

  it("produces different pixels for different families on the same scale", () => {
    const wave = makeWaveFieldResponse();
    const scale = fieldScale(wave);
    const make = (grid: number[][]) => {
      const data = new Uint8ClampedArray(wave.nx * wave.ny * 4);
      fillRgba(data, grid, scale);
      return Array.from(data);
    };
    const transverse = make(wave.transverse);
    const divergent = make(wave.divergent);
    const both = make(wave.combined);
    expect(transverse).not.toEqual(divergent);
    expect(transverse).not.toEqual(both);
    expect(divergent).not.toEqual(both);
  });
});

describe("overlay geometry", () => {
  it("builds Kelvin boundaries from the response metadata", () => {
    const wave = makeWaveFieldResponse({
      wake_length_m: 5,
      kelvin_angle_deg: 20,
    });
    const { port, starboard } = kelvinBoundaries(wave);
    expect(port[0]).toEqual({ x_m: 0, y_m: 0 });
    expect(port[1]?.x_m).toBe(-5);
    expect(port[1]?.y_m).toBeCloseTo(5 * Math.tan((20 * Math.PI) / 180), 10);
    expect(starboard[1]?.y_m).toBeCloseTo(-(port[1]?.y_m ?? 0), 10);
  });

  it("builds a viewBox covering the grid with room ahead of the duck", () => {
    const wave = makeWaveFieldResponse();
    const [x, y, w, h] = waveViewBox(wave).split(" ").map(Number);
    expect(x).toBe(-4);
    expect(y).toBeCloseTo(-1.4, 10);
    expect(h).toBeCloseTo(2.8, 10);
    expect((x ?? 0) + (w ?? 0)).toBeGreaterThan(0);
  });
});
