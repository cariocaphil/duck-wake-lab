import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMockCanvasContext,
  mockCanvasGetContext,
} from "../test/mockCanvasContext";
import { DEFAULT_PARAMETERS } from "../types";
import { WakeCanvas } from "./WakeCanvas";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WakeCanvas", () => {
  it("renders a labelled visualization region with a heading", () => {
    render(<WakeCanvas parameters={DEFAULT_PARAMETERS} />);
    expect(
      screen.getByRole("region", { name: "Wake visualization" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Visualization" }),
    ).toBeInTheDocument();
  });

  it("renders an accessible canvas", () => {
    render(<WakeCanvas parameters={DEFAULT_PARAMETERS} />);
    expect(
      screen.getByRole("img", { name: "Wake visualization placeholder" }),
    ).toBeInstanceOf(HTMLCanvasElement);
  });

  it("draws the placeholder caption for the given parameters", () => {
    const context = createMockCanvasContext();
    mockCanvasGetContext(context);

    render(<WakeCanvas parameters={DEFAULT_PARAMETERS} />);

    const drawnText = context.fillText.mock.calls.map((call) => call[0]);
    expect(drawnText).toContain("Wake visualization coming soon");
    expect(drawnText).toContain("Mallard · 0.70 m/s · Kelvin model");
  });

  it("repaints with new parameters without re-sizing the canvas", () => {
    const context = createMockCanvasContext();
    mockCanvasGetContext(context);

    const { rerender } = render(<WakeCanvas parameters={DEFAULT_PARAMETERS} />);
    const canvas = screen.getByRole("img");
    const sizeBefore = { width: canvas.getAttribute("width") };

    rerender(
      <WakeCanvas parameters={{ ...DEFAULT_PARAMETERS, species: "Teal" }} />,
    );

    const drawnText = context.fillText.mock.calls.map((call) => call[0]);
    expect(drawnText).toContain("Teal · 0.70 m/s · Kelvin model");
    expect(canvas.getAttribute("width")).toBe(sizeBefore.width);
  });
});
