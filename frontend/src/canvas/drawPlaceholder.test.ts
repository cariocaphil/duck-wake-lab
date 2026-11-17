import { describe, expect, it } from "vitest";
import {
  asCanvasContext,
  createMockCanvasContext,
} from "../test/mockCanvasContext";
import { DEFAULT_PARAMETERS, type DuckParameters } from "../types";
import { drawPlaceholder } from "./drawPlaceholder";

function draw(parameters: DuckParameters = DEFAULT_PARAMETERS) {
  const context = createMockCanvasContext();
  drawPlaceholder(asCanvasContext(context), 400, 300, parameters);
  return context;
}

function drawnText(context: ReturnType<typeof draw>): string[] {
  return context.fillText.mock.calls.map((call) => call[0] as string);
}

describe("drawPlaceholder", () => {
  it("clears the canvas and paints the water background", () => {
    const context = draw();
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 400, 300);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
  });

  it("draws surface ripples", () => {
    const context = draw();
    expect(context.stroke).toHaveBeenCalled();
  });

  it("draws the duck body, head and beak", () => {
    const context = draw();
    expect(context.ellipse).toHaveBeenCalledTimes(1);
    expect(context.arc).toHaveBeenCalledTimes(1);
    expect(context.closePath).toHaveBeenCalledTimes(1);
  });

  it("centres the duck body horizontally", () => {
    const context = draw();
    const [centerX] = context.ellipse.mock.calls[0] as number[];
    expect(centerX).toBe(200);
  });

  it("draws a bigger duck for a longer body", () => {
    const small = draw({ ...DEFAULT_PARAMETERS, bodyLength: 0.2 });
    const large = draw({ ...DEFAULT_PARAMETERS, bodyLength: 1.0 });

    const smallRadiusX = small.ellipse.mock.calls[0][2] as number;
    const largeRadiusX = large.ellipse.mock.calls[0][2] as number;
    expect(largeRadiusX).toBeGreaterThan(smallRadiusX);
  });

  it("draws the placeholder message and a parameter caption", () => {
    const text = drawnText(draw());
    expect(text).toContain("Wake visualization coming soon");
    expect(text).toContain("Mallard · 0.70 m/s · Kelvin model");
  });

  it("names the selected species, speed and physics level in the caption", () => {
    const text = drawnText(
      draw({
        species: "Muscovy",
        bodyLength: 0.6,
        speed: 1.256,
        physicsLevel: "advanced",
      }),
    );
    expect(text).toContain("Muscovy · 1.26 m/s · Advanced model");
  });
});
