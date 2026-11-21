import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaveVisualization } from "./WaveVisualization";
import { CREST_RGB } from "../waves/waveField";
import { makeWaveFieldResponse } from "../test/wakeFixtures";

const originalGetContext = HTMLCanvasElement.prototype.getContext;
let frames: Uint8ClampedArray[] = [];

beforeEach(() => {
  frames = [];
  const ctx = {
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: (image: { data: Uint8ClampedArray }) => {
      frames.push(Uint8ClampedArray.from(image.data));
    },
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never;
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.restoreAllMocks();
});

function renderWave(wave = makeWaveFieldResponse()) {
  return render(<WaveVisualization waveField={wave} loading={false} error={null} />);
}

/** RGB of the center pixel (middle row, middle column) of the last frame. */
function centerPixel(frame: Uint8ClampedArray | undefined): number[] {
  const wave = makeWaveFieldResponse();
  const row = Math.floor(wave.ny / 2);
  const col = Math.floor(wave.nx / 2);
  const offset = (row * wave.nx + col) * 4;
  return Array.from(frame?.slice(offset, offset + 3) ?? []);
}

describe("WaveVisualization", () => {
  it("offers Transverse, Divergent and Both, defaulting to Both", () => {
    renderWave();
    const group = screen.getByTestId("wave-family");
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual([
      "transverse",
      "divergent",
      "both",
    ]);
    expect(screen.getByRole("radio", { name: "Transverse" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Divergent" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Both" })).toBeChecked();
  });

  it("switching wave families updates the displayed field", () => {
    renderWave();
    const canvas = screen.getByTestId("wave-canvas");
    expect(canvas).toHaveAttribute("data-family", "both");
    expect(screen.getByTestId("wave-svg")).toHaveAttribute("data-family", "both");
    const bothFrame = frames.at(-1);
    expect(bothFrame).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Transverse" }));
    expect(canvas).toHaveAttribute("data-family", "transverse");
    const transverseFrame = frames.at(-1);
    expect(transverseFrame).not.toEqual(bothFrame);

    fireEvent.click(screen.getByRole("radio", { name: "Divergent" }));
    expect(canvas).toHaveAttribute("data-family", "divergent");
    const divergentFrame = frames.at(-1);
    expect(divergentFrame).not.toEqual(transverseFrame);
    expect(divergentFrame).not.toEqual(bothFrame);
    expect(screen.getByTestId("wave-svg")).toHaveAccessibleName(
      /divergent wave pattern/i,
    );
  });

  it("keeps the color scale and legend fixed when switching families", () => {
    renderWave();
    const scale = screen.getByTestId("wave-canvas").getAttribute("data-scale");
    const legend = screen.getByTestId("wave-legend").textContent;
    expect(Number(scale)).toBeCloseTo(1.2, 10);

    for (const name of ["Transverse", "Divergent", "Both"]) {
      fireEvent.click(screen.getByRole("radio", { name }));
      expect(screen.getByTestId("wave-canvas")).toHaveAttribute(
        "data-scale",
        scale ?? "",
      );
      expect(screen.getByTestId("wave-legend").textContent).toBe(legend);
    }
    expect(legend).toContain("1.20");
  });

  it("does not saturate a weaker family on the shared scale", () => {
    renderWave();
    // Combined peak (1.2) is the scale, so it reaches the full crest color...
    expect(centerPixel(frames.at(-1))).toEqual([...CREST_RGB]);

    // ...while the weaker transverse-only peak (1.0) stays paler.
    fireEvent.click(screen.getByRole("radio", { name: "Transverse" }));
    const transverse = centerPixel(frames.at(-1));
    expect(transverse).not.toEqual([...CREST_RGB]);
    expect(transverse[0]).toBeGreaterThan(CREST_RGB[0]);
  });

  it("toggles Kelvin boundary lines", () => {
    renderWave();
    expect(screen.getByTestId("wave-kelvin-port")).toBeInTheDocument();
    expect(screen.getByTestId("wave-kelvin-starboard")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show Kelvin boundaries"));
    expect(screen.queryByTestId("wave-kelvin-port")).not.toBeInTheDocument();
    expect(screen.getByTestId("wave-duck")).toBeInTheDocument();
  });

  it("makes no network requests when switching families", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWave();
    fireEvent.click(screen.getByRole("radio", { name: "Transverse" }));
    fireEvent.click(screen.getByRole("radio", { name: "Divergent" }));
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("shows a loading message before the first response", () => {
    render(<WaveVisualization waveField={null} loading={true} error={null} />);
    const status = screen.getByTestId("wave-status");
    expect(status).toHaveTextContent("Loading wave pattern…");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveClass("wake-status--info");
    expect(screen.queryByTestId("wave-svg")).not.toBeInTheDocument();
  });

  it("keeps the previous field and shows an updating message while reloading", () => {
    render(
      <WaveVisualization
        waveField={makeWaveFieldResponse()}
        loading={true}
        error={null}
      />,
    );
    expect(screen.getByTestId("wave-svg")).toBeInTheDocument();
    expect(screen.getByTestId("wave-status")).toHaveTextContent(
      "Updating wave pattern…",
    );
  });

  it("shows an API error message", () => {
    render(
      <WaveVisualization
        waveField={null}
        loading={false}
        error="Wave-field request failed (500)"
      />,
    );
    const status = screen.getByTestId("wave-status");
    expect(status).toHaveTextContent("Wave-field request failed (500)");
    expect(status).toHaveClass("wake-status--error");
    expect(status).toHaveAttribute("role", "alert");
    expect(screen.getAllByText("Wave-field request failed (500)")).toHaveLength(1);
  });

  it("explains the physics and labels the model as illustrative", () => {
    renderWave();
    const explanation = screen.getByTestId("wave-explanation");
    expect(explanation.tagName).toBe("DETAILS");
    for (const heading of [
      "Transverse waves",
      "Divergent waves",
      "Constructive interference",
      "Destructive interference",
    ]) {
      expect(within(explanation).getByText(heading)).toBeInTheDocument();
    }
    expect(explanation).toHaveTextContent(/reinforce/i);
    expect(explanation).toHaveTextContent(/cancel/i);
    expect(explanation).toHaveTextContent(/Kelvin angle/i);
    expect(explanation).toHaveTextContent(/not the direction of the individual wave crests/i);
    expect(screen.getByTestId("wave-model-label")).toHaveTextContent(
      /illustrative interference model/i,
    );
    expect(screen.getByTestId("wave-model-label")).toHaveTextContent(
      /not a physically exact duck wake/i,
    );
  });
});
