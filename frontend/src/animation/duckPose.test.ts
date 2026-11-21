import { describe, expect, it } from "vitest";
import { FOOT_PIVOTS, FOOT_SWING_DEG, footTransform } from "./duckPose";

describe("footTransform", () => {
  it("is neutral at phase 0 and swings within the limit", () => {
    expect(footTransform("port", 0)).toBe(
      `rotate(0.00 ${FOOT_PIVOTS.port.x} ${FOOT_PIVOTS.port.y})`,
    );
    expect(footTransform("port", Math.PI / 2)).toContain(
      `rotate(${FOOT_SWING_DEG.toFixed(2)} `,
    );
  });

  it("paddles the two feet in alternation", () => {
    const quarter = Math.PI / 2;
    expect(footTransform("port", quarter)).toContain("rotate(28.00 ");
    expect(footTransform("starboard", quarter)).toContain("rotate(-28.00 ");
  });
});
