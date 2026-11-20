import type { WakeResponse } from "../api/types";

const MIN_EXTENT = 1e-6;
const PAD_X_FRACTION = 0.08;
const PAD_Y_FRACTION = 0.15;
const ARROW_PAD_FRACTION = 0.12;

/**
 * Build an SVG polyline `points` string from physics coordinates.
 * Negates y so physics-up maps to SVG-down.
 */
export function polylinePoints(xs: number[], ys: number[]): string {
  if (xs.length !== ys.length) {
    throw new Error(
      `polylinePoints: x/y length mismatch (${xs.length} vs ${ys.length})`,
    );
  }
  if (xs.length === 0) {
    return "";
  }
  return xs.map((x, i) => `${x},${-ys[i]!}`).join(" ");
}

/**
 * Compute an SVG viewBox that fits the wake scene with padding and room
 * for the swimming-direction arrow ahead of the duck.
 */
export function computeViewBox(wake: WakeResponse): string {
  const xs = [...wake.port_x_m, ...wake.starboard_x_m, 0];
  const physicsYs = [...wake.port_y_m, ...wake.starboard_y_m, 0];
  const svgYs = physicsYs.map((y) => -y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...svgYs);
  const maxY = Math.max(...svgYs);

  const wakeWidth = Math.max(maxX - minX, MIN_EXTENT);
  const wakeHeight = Math.max(maxY - minY, MIN_EXTENT);
  const arrowPad = wakeWidth * ARROW_PAD_FRACTION;
  const padX = wakeWidth * PAD_X_FRACTION;
  const padY = wakeHeight * PAD_Y_FRACTION;

  const left = minX - padX;
  const right = maxX + arrowPad + padX;
  const top = minY - padY;
  const bottom = maxY + padY;

  return `${left} ${top} ${right - left} ${bottom - top}`;
}
