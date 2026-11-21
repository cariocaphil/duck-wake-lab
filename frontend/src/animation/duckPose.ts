// Visual-only duck pose helpers (no physics).

/** Pivot of each paddling foot, in duck-length units. */
export const FOOT_PIVOTS = {
  port: { x: -0.3, y: 0.15 },
  starboard: { x: -0.3, y: -0.15 },
} as const;

/** Maximum paddling swing, degrees. */
export const FOOT_SWING_DEG = 28;

/** SVG `transform` for a foot at a stroke phase (starboard is half a cycle behind). */
export function footTransform(
  side: keyof typeof FOOT_PIVOTS,
  strokePhase: number,
): string {
  const offset = side === "port" ? 0 : Math.PI;
  const angle = FOOT_SWING_DEG * Math.sin(strokePhase + offset);
  const { x, y } = FOOT_PIVOTS[side];
  return `rotate(${angle.toFixed(2)} ${x} ${y})`;
}
