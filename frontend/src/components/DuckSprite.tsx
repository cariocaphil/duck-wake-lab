import type { Ref } from "react";
import { FOOT_PIVOTS } from "../animation/duckPose";

interface DuckSpriteProps {
  /** Duck body length in meters; the sprite is drawn to true scale. */
  lengthM: number;
  portFootRef: Ref<SVGEllipseElement>;
  starboardFootRef: Ref<SVGEllipseElement>;
}

/**
 * Simple top-down duck facing +x, centred on the origin of the camera frame.
 * Authored in duck-length units and scaled to meters, so it sits correctly
 * against the wake. Feet are animated imperatively by the parent (no React
 * render per frame).
 */
export function DuckSprite({
  lengthM,
  portFootRef,
  starboardFootRef,
}: DuckSpriteProps) {
  return (
    <g
      data-testid="wave-duck"
      className="wake-duck wave-duck"
      transform={`scale(${lengthM})`}
      aria-hidden="true"
    >
      <ellipse
        ref={portFootRef}
        className="duck-foot"
        cx={FOOT_PIVOTS.port.x - 0.06}
        cy={FOOT_PIVOTS.port.y}
        rx={0.1}
        ry={0.045}
      />
      <ellipse
        ref={starboardFootRef}
        className="duck-foot"
        cx={FOOT_PIVOTS.starboard.x - 0.06}
        cy={FOOT_PIVOTS.starboard.y}
        rx={0.1}
        ry={0.045}
      />
      <path className="duck-tail" d="M-0.42 -0.07 L-0.56 0 L-0.42 0.07 Z" />
      <ellipse className="duck-body" cx={-0.04} cy={0} rx={0.46} ry={0.25} />
      <ellipse
        className="duck-wing"
        cx={-0.1}
        cy={0.15}
        rx={0.22}
        ry={0.08}
        transform="rotate(-12 -0.1 0.15)"
      />
      <ellipse
        className="duck-wing"
        cx={-0.1}
        cy={-0.15}
        rx={0.22}
        ry={0.08}
        transform="rotate(12 -0.1 -0.15)"
      />
      <circle className="duck-head" cx={0.34} cy={0} r={0.14} />
      <path className="duck-beak" d="M0.45 -0.05 L0.6 0 L0.45 0.05 Z" />
    </g>
  );
}
