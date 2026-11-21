import { describe, expect, it } from "vitest";
import { computeViewBox, polylinePoints } from "./wakeSvg";
import { makeWakeResponse, point } from "../test/wakeFixtures";

describe("polylinePoints", () => {
  it("negates y for the SVG coordinate system", () => {
    expect(polylinePoints([point(0, 0), point(-1, 0.5)])).toBe("0,0 -1,-0.5");
  });

  it("returns an empty string for an empty array", () => {
    expect(polylinePoints([])).toBe("");
  });
});

describe("computeViewBox", () => {
  it("adds padding and arrow room beyond the raw wake extents", () => {
    const wake = makeWakeResponse({
      port_boundary: [point(0, 0), point(-5, 1)],
      starboard_boundary: [point(0, 0), point(-5, -1)],
    });
    const [minX, minY, width, height] = computeViewBox(wake)
      .split(" ")
      .map(Number);

    // Raw physics x span is [-5, 0]; SVG y after flip is [-1, 1].
    expect(minX).toBeLessThan(-5);
    expect(minY).toBeLessThan(-1);
    expect(width).toBeGreaterThan(5);
    // Right edge past duck (x=0) for the swim arrow.
    expect(minX + width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(2);
  });

  it("yields finite positive dimensions for a degenerate tiny wake", () => {
    const wake = makeWakeResponse({
      wake_length_m: 0,
      port_boundary: [point(0, 0), point(0, 0)],
      starboard_boundary: [point(0, 0), point(0, 0)],
    });
    const parts = computeViewBox(wake).split(" ").map(Number);
    expect(parts).toHaveLength(4);
    expect(parts.every(Number.isFinite)).toBe(true);
    expect(parts[2]).toBeGreaterThan(0);
    expect(parts[3]).toBeGreaterThan(0);
  });
});
