import { describe, expect, it } from "vitest";
import {
  makeAnimatedWaveFieldResponse,
  makeWaveFieldResponse,
} from "../test/wakeFixtures";
import {
  CREST_RGB,
  NEUTRAL_RGB,
  TROUGH_RGB,
  WAVE_FAMILY_IDS,
  WAVE_FAMILY_LABELS,
  animatedDisplacement,
  displacementToRgba,
  fieldScale,
  fillAnimatedRgba,
  fillRgba,
  isWaveFamily,
  kelvinBoundaries,
  prepareAnimatedField,
  selectField,
  waterMarksPath,
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

describe("fieldScale with quadrature", () => {
  it("bounds the animated displacement at every phase", () => {
    const wave = makeAnimatedWaveFieldResponse();
    const scale = fieldScale(wave);
    const field = prepareAnimatedField(wave);
    for (let step = 0; step < 64; step += 1) {
      const phase = (2 * Math.PI * step) / 64;
      for (let index = 0; index < field.transverse.length; index += 1) {
        const total =
          animatedDisplacement(
            field.transverse[index] ?? 0,
            field.transverseQuadrature[index] ?? 0,
            phase,
          ) +
          animatedDisplacement(
            field.divergent[index] ?? 0,
            field.divergentQuadrature[index] ?? 0,
            phase * 1.7,
          );
        expect(Math.abs(total)).toBeLessThanOrEqual(scale + 1e-6);
      }
    }
  });

  it("is never smaller than the static fields", () => {
    const wave = makeAnimatedWaveFieldResponse();
    expect(fieldScale(wave)).toBeGreaterThanOrEqual(fieldScale(makeWaveFieldResponse()));
  });
});

describe("traveling wave: A cos(phi - omega t) via quadrature", () => {
  it("equals the static field at phase 0", () => {
    expect(animatedDisplacement(0.6, 0.3, 0)).toBeCloseTo(0.6, 12);
  });

  it("matches A cos(phi - phase) for a known amplitude and phase", () => {
    const amplitude = 0.8;
    const phi = 0.7;
    for (const phase of [0, 0.4, 1.3, Math.PI, 5]) {
      expect(
        animatedDisplacement(
          amplitude * Math.cos(phi),
          amplitude * Math.sin(phi),
          phase,
        ),
      ).toBeCloseTo(amplitude * Math.cos(phi - phase), 12);
    }
  });

  it("flips sign after half a period and returns after a full one", () => {
    expect(animatedDisplacement(0.6, 0.3, Math.PI)).toBeCloseTo(-0.6, 12);
    expect(animatedDisplacement(0.6, 0.3, 2 * Math.PI)).toBeCloseTo(0.6, 12);
  });

  it("moves a crest astern (to larger distance behind the duck)", () => {
    const k = 2 * Math.PI; // wavenumber for a 1 m wavelength
    const crestPosition = (phase: number) => {
      let best = 0;
      let bestValue = -Infinity;
      for (let step = 0; step <= 1000; step += 1) {
        const s = step / 1000; // 0..1 m behind the duck
        const value = animatedDisplacement(
          Math.cos(k * s),
          Math.sin(k * s),
          phase,
        );
        if (value > bestValue) {
          bestValue = value;
          best = s;
        }
      }
      return best;
    };
    // A cos(k s - phase) peaks at s = phase / k.
    expect(crestPosition(0.5)).toBeCloseTo(0.5 / k, 2);
    expect(crestPosition(1.5)).toBeGreaterThan(crestPosition(0.5));
  });
});

describe("prepareAnimatedField / fillAnimatedRgba", () => {
  it("flattens grids row-major", () => {
    const wave = makeAnimatedWaveFieldResponse();
    const field = prepareAnimatedField(wave);
    expect(field.nx).toBe(5);
    expect(field.ny).toBe(3);
    expect(field.transverse).toHaveLength(15);
    expect(field.transverse[1 * 5 + 2]).toBeCloseTo(1.0, 6);
    expect(field.divergentQuadrature[1 * 5 + 3]).toBeCloseTo(0.2, 6);
  });

  it("reproduces the static picture at phase 0 for every family", () => {
    const wave = makeAnimatedWaveFieldResponse();
    const scale = fieldScale(wave);
    const field = prepareAnimatedField(wave);
    for (const family of ["transverse", "divergent", "both"] as const) {
      const animated = new Uint8ClampedArray(5 * 3 * 4);
      const reference = new Uint8ClampedArray(5 * 3 * 4);
      fillAnimatedRgba(animated, field, family, { transverse: 0, divergent: 0 }, scale);
      fillRgba(reference, selectField(wave, family), scale);
      expect(Array.from(animated)).toEqual(Array.from(reference));
    }
  });

  it("changes the picture as the phase advances and repeats each period", () => {
    const wave = makeAnimatedWaveFieldResponse();
    const scale = fieldScale(wave);
    const field = prepareAnimatedField(wave);
    const frame = (t: number, d: number) => {
      const data = new Uint8ClampedArray(5 * 3 * 4);
      fillAnimatedRgba(data, field, "both", { transverse: t, divergent: d }, scale);
      return Array.from(data);
    };
    expect(frame(1, 1.5)).not.toEqual(frame(0, 0));
    expect(frame(2 * Math.PI, 2 * Math.PI)).toEqual(frame(0, 0));
  });

  it("evolves each family with its own phase", () => {
    const wave = makeAnimatedWaveFieldResponse();
    const scale = fieldScale(wave);
    const field = prepareAnimatedField(wave);
    const transverseOnly = (d: number) => {
      const data = new Uint8ClampedArray(5 * 3 * 4);
      fillAnimatedRgba(data, field, "transverse", { transverse: 0.5, divergent: d }, scale);
      return Array.from(data);
    };
    // The divergent phase must not affect the transverse-only view.
    expect(transverseOnly(0)).toEqual(transverseOnly(2));
  });
});

describe("waterMarksPath", () => {
  it("is empty for a non-positive spacing", () => {
    expect(waterMarksPath(-4, 0, 1, 0)).toBe("");
  });

  it("places dots at multiples of the spacing around the extent", () => {
    const path = waterMarksPath(-1, 0, 0.5, 0.5);
    expect(path).toContain("M-0.5 0h0");
    expect(path).toContain("M0 0h0");
    // Includes one cell of margin so scrolling never reveals an edge.
    expect(path).toContain("M-1.5 0h0");
    expect(path).toContain("M0.5 0h0");
  });
});
