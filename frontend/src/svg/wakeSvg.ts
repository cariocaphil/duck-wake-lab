import type { Point2D, WakeResponse } from "../api/wakeClient";

const MIN_EXTENT = 1e-6;
const PAD_X_FRACTION = 0.08;
const PAD_Y_FRACTION = 0.15;
const ARROW_PAD_FRACTION = 0.12;

/**
 * Build an SVG polyline `points` string from physics Point2D coordinates.
 * Negates y so physics-up maps to SVG-down.
 */
export function polylinePoints(points: Point2D[]): string {
  if (points.length === 0) {
    return "";
  }
  return points.map((point) => `${point.x_m},${-point.y_m}`).join(" ");
}

/**
 * Compute an SVG viewBox that fits the wake scene with padding and room
 * for the swimming-direction arrow ahead of the duck.
 */
export function computeViewBox(wake: WakeResponse): string {
  const xs = [
    ...wake.port_boundary.map((p) => p.x_m),
    ...wake.starboard_boundary.map((p) => p.x_m),
    0,
  ];
  const physicsYs = [
    ...wake.port_boundary.map((p) => p.y_m),
    ...wake.starboard_boundary.map((p) => p.y_m),
    0,
  ];
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
