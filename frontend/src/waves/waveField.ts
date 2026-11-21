import type { Point2D, WaveFieldResponse } from "../api/wakeClient";

/** Which displacement field to show. `both` is the combined superposition. */
export type WaveFamily = "transverse" | "divergent" | "both";

export const WAVE_FAMILY_IDS: readonly WaveFamily[] = [
  "transverse",
  "divergent",
  "both",
];

export const WAVE_FAMILY_LABELS: Record<WaveFamily, string> = {
  transverse: "Transverse",
  divergent: "Divergent",
  both: "Both",
};

export const DEFAULT_WAVE_FAMILY: WaveFamily = "both";

export function isWaveFamily(value: string): value is WaveFamily {
  return WAVE_FAMILY_IDS.some((id) => id === value);
}

/** Pick the [ny][nx] grid for a wave family (`both` is the combined field). */
export function selectField(
  wave: WaveFieldResponse,
  family: WaveFamily,
): number[][] {
  switch (family) {
    case "transverse":
      return wave.transverse;
    case "divergent":
      return wave.divergent;
    case "both":
      return wave.combined;
  }
}

/**
 * One symmetric color-scale half-range for a response. It is the largest
 * displacement the animation can reach anywhere on the grid: the sum of the
 * two families' amplitude envelopes, `hypot(A cos, A sin)` each (and never
 * less than any static grid value). Because it bounds `A cos(phi - omega t)`
 * for every t, colors neither clip nor rescale while the waves move, and it
 * does not depend on the selected family, so switching families never
 * rescales the colors. Falls back to 1 for an all-zero field.
 */
export function fieldScale(wave: WaveFieldResponse): number {
  let max = 0;
  for (let j = 0; j < wave.transverse.length; j += 1) {
    const row = wave.transverse[j] ?? [];
    for (let i = 0; i < row.length; i += 1) {
      const t = row[i] ?? 0;
      const d = wave.divergent[j]?.[i] ?? 0;
      const tq = wave.transverse_quadrature[j]?.[i] ?? 0;
      const dq = wave.divergent_quadrature[j]?.[i] ?? 0;
      const c = wave.combined[j]?.[i] ?? 0;
      const bound = Math.max(
        Math.hypot(t, tq) + Math.hypot(d, dq),
        Math.abs(t),
        Math.abs(d),
        Math.abs(c),
      );
      if (bound > max) {
        max = bound;
      }
    }
  }
  return max > 0 && Number.isFinite(max) ? max : 1;
}

export type Rgb = readonly [number, number, number];

// Colorblind-friendly diverging ramp: blue (trough) - near white - orange (crest).
export const TROUGH_RGB: Rgb = [33, 102, 172];
export const NEUTRAL_RGB: Rgb = [247, 247, 247];
export const CREST_RGB: Rgb = [217, 95, 2];

function mix(from: Rgb, to: Rgb, t: number): [number, number, number] {
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}

/** Map a displacement to RGBA on the shared symmetric scale (clamped). */
export function displacementToRgba(
  value: number,
  scale: number,
): [number, number, number, number] {
  const t = Math.min(Math.abs(value) / scale, 1);
  const [r, g, b] = mix(NEUTRAL_RGB, value >= 0 ? CREST_RGB : TROUGH_RGB, t);
  return [r, g, b, 255];
}

/** CSS color for a ramp stop, e.g. for the legend gradient. */
export function rgbCss(rgb: Rgb): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Fill an RGBA pixel buffer (nx * ny pixels). Grid row 0 is the lowest y, but
 * canvas row 0 is the top, so rows are flipped (physics y up).
 */
export function fillRgba(
  data: Uint8ClampedArray,
  field: number[][],
  scale: number,
): void {
  const ny = field.length;
  for (let j = 0; j < ny; j += 1) {
    const row = field[j] ?? [];
    const canvasRow = ny - 1 - j;
    for (let i = 0; i < row.length; i += 1) {
      const [r, g, b, a] = displacementToRgba(row[i] ?? 0, scale);
      const offset = (canvasRow * row.length + i) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = a;
    }
  }
}

/** Kelvin envelope arms (reference only) from the response's own metadata. */
export function kelvinBoundaries(wave: WaveFieldResponse): {
  port: Point2D[];
  starboard: Point2D[];
} {
  const tan = Math.tan((wave.kelvin_angle_deg * Math.PI) / 180);
  const length = wave.wake_length_m;
  return {
    port: [
      { x_m: 0, y_m: 0 },
      { x_m: -length, y_m: length * tan },
    ],
    starboard: [
      { x_m: 0, y_m: 0 },
      { x_m: -length, y_m: -length * tan },
    ],
  };
}

/**
 * SVG viewBox in physics meters (y negated) covering the grid plus a small
 * margin ahead of the duck for the marker.
 */
export function waveViewBox(wave: WaveFieldResponse): string {
  const xMin = Math.min(...wave.x_m);
  const xMax = Math.max(...wave.x_m);
  const yHalf = Math.max(...wave.y_m.map(Math.abs));
  const pad = (xMax - xMin) * 0.06;
  return `${xMin} ${-yHalf} ${xMax - xMin + pad} ${2 * yHalf}`;
}

/**
 * Flat, typed copies of the cosine and quadrature grids (row-major,
 * `ny * nx`), built once per response so per-frame work allocates nothing.
 */
export interface AnimatedField {
  nx: number;
  ny: number;
  transverse: Float32Array;
  transverseQuadrature: Float32Array;
  divergent: Float32Array;
  divergentQuadrature: Float32Array;
}

function flatten(grid: number[][], nx: number, ny: number): Float32Array {
  const out = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j += 1) {
    const row = grid[j] ?? [];
    for (let i = 0; i < nx; i += 1) {
      out[j * nx + i] = row[i] ?? 0;
    }
  }
  return out;
}

export function prepareAnimatedField(wave: WaveFieldResponse): AnimatedField {
  const { nx, ny } = wave;
  return {
    nx,
    ny,
    transverse: flatten(wave.transverse, nx, ny),
    transverseQuadrature: flatten(wave.transverse_quadrature, nx, ny),
    divergent: flatten(wave.divergent, nx, ny),
    divergentQuadrature: flatten(wave.divergent_quadrature, nx, ny),
  };
}

/**
 * Displacement of one family at phase offset `phase` (radians):
 * `A cos(phi - phase) = A cos(phi) cos(phase) + A sin(phi) sin(phase)`.
 * At `phase = 0` this is exactly the static PR #7 value.
 */
export function animatedDisplacement(
  cosine: number,
  quadrature: number,
  phase: number,
): number {
  return cosine * Math.cos(phase) + quadrature * Math.sin(phase);
}

/** Animation phases (radians) accumulated for each family. */
export interface WavePhases {
  transverse: number;
  divergent: number;
}

function writePixel(
  data: Uint8ClampedArray,
  offset: number,
  value: number,
  scale: number,
): void {
  const t = Math.min(Math.abs(value) / scale, 1);
  const target = value >= 0 ? CREST_RGB : TROUGH_RGB;
  data[offset] = Math.round(NEUTRAL_RGB[0] + (target[0] - NEUTRAL_RGB[0]) * t);
  data[offset + 1] = Math.round(
    NEUTRAL_RGB[1] + (target[1] - NEUTRAL_RGB[1]) * t,
  );
  data[offset + 2] = Math.round(
    NEUTRAL_RGB[2] + (target[2] - NEUTRAL_RGB[2]) * t,
  );
  data[offset + 3] = 255;
}

/**
 * Per-frame fill of an RGBA buffer from the traveling-wave field
 * `eta = A cos(phi - omega t)` per family (`both` sums the two families).
 * Row flipping matches `fillRgba` (physics y up, canvas row 0 at the top).
 */
export function fillAnimatedRgba(
  data: Uint8ClampedArray,
  field: AnimatedField,
  family: WaveFamily,
  phases: WavePhases,
  scale: number,
): void {
  const { nx, ny } = field;
  const cosT = Math.cos(phases.transverse);
  const sinT = Math.sin(phases.transverse);
  const cosD = Math.cos(phases.divergent);
  const sinD = Math.sin(phases.divergent);
  const useT = family !== "divergent";
  const useD = family !== "transverse";

  for (let j = 0; j < ny; j += 1) {
    const canvasRow = ny - 1 - j;
    for (let i = 0; i < nx; i += 1) {
      const index = j * nx + i;
      let value = 0;
      if (useT) {
        value +=
          (field.transverse[index] ?? 0) * cosT +
          (field.transverseQuadrature[index] ?? 0) * sinT;
      }
      if (useD) {
        value +=
          (field.divergent[index] ?? 0) * cosD +
          (field.divergentQuadrature[index] ?? 0) * sinD;
      }
      writePixel(data, (canvasRow * nx + i) * 4, value, scale);
    }
  }
}

/**
 * SVG path of world-fixed reference dots (round caps on zero-length
 * segments) at multiples of `spacingM`, covering the given camera-relative
 * extent plus one cell of margin on every side. Translate the path by
 * `-waterMarkOffsetM(distance, spacing)` in x to scroll it with the camera.
 * `y` is already in SVG orientation (physics y negated), and the pattern is
 * symmetric about y = 0.
 */
export function waterMarksPath(
  xMinM: number,
  xMaxM: number,
  yHalfM: number,
  spacingM: number,
): string {
  if (!(spacingM > 0)) {
    return "";
  }
  const kMin = Math.floor(xMinM / spacingM) - 1;
  const kMax = Math.ceil(xMaxM / spacingM) + 1;
  const jMax = Math.ceil(yHalfM / spacingM);
  const parts: string[] = [];
  for (let j = -jMax; j <= jMax; j += 1) {
    for (let k = kMin; k <= kMax; k += 1) {
      parts.push(`M${k * spacingM} ${j * spacingM}h0`);
    }
  }
  return parts.join("");
}
