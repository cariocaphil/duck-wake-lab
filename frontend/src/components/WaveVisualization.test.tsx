import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaveVisualization } from "./WaveVisualization";
import {
  CREST_RGB,
  fieldScale,
  fillRgba,
  selectField,
} from "../waves/waveField";
import {
  installFakeFrames,
  stubReducedMotion,
  type FakeFrames,
} from "../test/animationFrames";
import {
  makeAnimatedWaveFieldResponse,
  makeWaveFieldResponse,
} from "../test/wakeFixtures";

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


describe("WaveVisualization animation", () => {
  let fake: FakeFrames;

  beforeEach(() => {
    fake = installFakeFrames();
  });

  afterEach(() => {
    fake.restore();
  });

  /** Camera-relative x offset of the world-fixed water marks. */
  function markOffset(): number {
    const transform =
      screen.getByTestId("wave-water-marks").getAttribute("transform") ?? "";
    const match = /translate\((-?[\d.e-]+) 0\)/.exec(transform);
    return match ? Number(match[1]) : Number.NaN;
  }

  /** Flush frames covering `ms` of real time; returns the last timestamp. */
  function play(ms: number, startMs = 0, stepMs = 1000 / 60): number {
    let now = startMs;
    act(() => fake.flush(now)); // baseline frame
    const count = Math.round(ms / stepMs);
    for (let i = 0; i < count; i += 1) {
      now += stepMs;
      act(() => fake.flush(now));
    }
    return now;
  }

  function renderAnimated(wave = makeAnimatedWaveFieldResponse()) {
    return render(
      <WaveVisualization waveField={wave} loading={false} error={null} />,
    );
  }

  it("shows a true-scale duck that stays at the camera origin", () => {
    renderAnimated();
    const duck = screen.getByTestId("wave-duck");
    expect(duck).toHaveAttribute("transform", "scale(0.55)");
    expect(duck).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("wave-svg")).toHaveAccessibleName(
      /behind the swimming duck/i,
    );
    play(500);
    // The duck (and wake) never move in camera space.
    expect(screen.getByTestId("wave-duck")).toHaveAttribute("transform", "scale(0.55)");
  });

  it("evolves the wave pattern over time while playing", () => {
    renderAnimated();
    const initial = frames.at(-1);
    play(300);
    const later = frames.at(-1);
    expect(later).not.toEqual(initial);
    expect(frames.length).toBeGreaterThan(10);
  });

  it("draws the unchanged static PR #7 field at time zero", () => {
    const wave = makeAnimatedWaveFieldResponse();
    renderAnimated(wave);
    const expected = new Uint8ClampedArray(wave.nx * wave.ny * 4);
    fillRgba(expected, selectField(wave, "both"), fieldScale(wave));
    expect(Array.from(frames.at(-1) ?? [])).toEqual(Array.from(expected));
  });

  it("scrolls the world marks by the distance swum", () => {
    renderAnimated(makeAnimatedWaveFieldResponse({ swimming_speed_m_s: 1.2 }));
    expect(markOffset()).toBeCloseTo(0, 9);
    play(500);
    // 1.2 m/s over ~0.5 s = 0.6 m; marks are 2 x 0.55 m apart.
    expect(markOffset()).toBeCloseTo(-0.6, 1);
  });

  it("does not translate at zero swimming speed but keeps the waves alive", () => {
    renderAnimated(makeAnimatedWaveFieldResponse({ swimming_speed_m_s: 0 }));
    const initial = frames.at(-1);
    play(500);
    expect(markOffset()).toBeCloseTo(0, 9);
    expect(frames.at(-1)).not.toEqual(initial);
  });

  it("scales playback with the animation speed without changing physics", () => {
    renderAnimated();
    fireEvent.click(screen.getByRole("radio", { name: "2×" }));
    play(250);
    const doubled = markOffset();
    expect(doubled).toBeCloseTo(-0.6, 1); // 2x of 0.3 m
    expect(screen.getByTestId("animation-hint")).toHaveTextContent("1.20 m/s");
  });

  it("pauses both duck movement and wave propagation, then resumes", () => {
    renderAnimated();
    const now = play(300);
    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    expect(fake.pending()).toBe(0);
    const frozenOffset = markOffset();
    const frozenFrame = frames.at(-1);

    act(() => fake.flush(now + 5000));
    expect(markOffset()).toBe(frozenOffset);
    expect(frames.at(-1)).toEqual(frozenFrame);

    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    play(200, now + 5000);
    expect(markOffset()).not.toBe(frozenOffset);
  });

  it("reset returns the duck and waves to their initial state", () => {
    renderAnimated();
    const initialFrame = frames.at(-1);
    play(400);
    expect(markOffset()).not.toBeCloseTo(0, 3);

    fireEvent.click(screen.getByRole("button", { name: "Reset animation" }));
    expect(markOffset()).toBeCloseTo(0, 9);
    expect(frames.at(-1)).toEqual(initialFrame);
    // Reset does not touch the wave family or playback speed.
    expect(screen.getByRole("radio", { name: "Both" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1×" })).toBeChecked();
  });

  it("repaints while paused when the family changes, without advancing time", () => {
    renderAnimated();
    play(300);
    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    const offset = markOffset();
    const before = frames.length;
    fireEvent.click(screen.getByRole("radio", { name: "Transverse" }));
    expect(frames.length).toBeGreaterThan(before);
    expect(markOffset()).toBe(offset);
  });

  it("keeps time and distance when new physics arrives mid-swim", () => {
    const { rerender } = renderAnimated();
    play(300);
    const before = markOffset();
    rerender(
      <WaveVisualization
        waveField={makeAnimatedWaveFieldResponse({
          duck_length_m: 0.55,
          transverse_omega_rad_s: 14,
        })}
        loading={false}
        error={null}
      />,
    );
    // The accumulated distance is preserved (no snap back to zero).
    expect(markOffset()).toBeCloseTo(before, 9);
  });

  it("starts paused when reduced motion is requested and plays on demand", () => {
    fake.restore();
    fake = installFakeFrames();
    stubReducedMotion(true);
    renderAnimated();
    expect(fake.pending()).toBe(0);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
    expect(screen.getByTestId("animation-reduced-motion")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    play(300);
    expect(markOffset()).not.toBeCloseTo(0, 3);
  });

  it("cancels its animation frame on unmount", () => {
    const { unmount } = renderAnimated();
    expect(fake.pending()).toBe(1);
    unmount();
    expect(fake.pending()).toBe(0);
  });

  it("makes no network requests while animating or using the controls", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderAnimated();
    play(500);
    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    fireEvent.click(screen.getByRole("radio", { name: "0.5×" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset animation" }));
    play(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not animate before the first response", () => {
    render(<WaveVisualization waveField={null} loading={true} error={null} />);
    act(() => fake.flush(0));
    act(() => fake.flush(16));
    expect(frames).toHaveLength(0);
    expect(screen.getByTestId("animation-controls")).toBeInTheDocument();
  });
});
