import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  installFakeFrames,
  stubReducedMotion,
  type FakeFrames,
} from "./test/animationFrames";
import {
  makeAnimatedWaveFieldResponse,
  makeWakeResponse,
  mockJsonResponse,
  stubRoutedFetch,
} from "./test/wakeFixtures";

let fake: FakeFrames;

beforeEach(() => {
  fake = installFakeFrames();
});

afterEach(() => {
  fake.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface WaveBody {
  duck_length_m: number;
  swimming_speed_m_s: number;
}

function bodyOf(call: unknown[]): WaveBody {
  return JSON.parse(String((call[1] as RequestInit).body)) as WaveBody;
}

/** Wave-field mock that echoes the requested length and speed. */
function echoWaveFetch() {
  return vi.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as WaveBody;
    return Promise.resolve(
      mockJsonResponse(
        makeAnimatedWaveFieldResponse({
          duck_length_m: body.duck_length_m,
          swimming_speed_m_s: body.swimming_speed_m_s,
        }),
      ),
    );
  });
}

function setup(waveFetch = echoWaveFetch()) {
  const wakeFetch = vi.fn().mockResolvedValue(mockJsonResponse(makeWakeResponse()));
  stubRoutedFetch(wakeFetch, waveFetch);
  const view = render(<App />);
  return { wakeFetch, waveFetch, unmount: view.unmount };
}

async function settled(waveFetch: ReturnType<typeof vi.fn>, wakeFetch: ReturnType<typeof vi.fn>) {
  await waitFor(() => {
    expect(screen.getByTestId("wave-svg")).toBeInTheDocument();
    expect(screen.getByTestId("wake-svg")).toBeInTheDocument();
  });
  expect(waveFetch).toHaveBeenCalledTimes(1);
  expect(wakeFetch).toHaveBeenCalledTimes(1);
}

function play(ms: number, startMs = 0, stepMs = 1000 / 60): number {
  let now = startMs;
  act(() => fake.flush(now));
  const count = Math.round(ms / stepMs);
  for (let i = 0; i < count; i += 1) {
    now += stepMs;
    act(() => fake.flush(now));
  }
  return now;
}

function markOffset(): number {
  const transform =
    screen.getByTestId("wave-water-marks").getAttribute("transform") ?? "";
  const match = /translate\((-?[\d.e-]+) 0\)/.exec(transform);
  return match ? Number(match[1]) : Number.NaN;
}

describe("App animation integration", () => {
  it("issues no API requests for animation frames or playback controls", async () => {
    const { wakeFetch, waveFetch } = setup();
    await settled(waveFetch, wakeFetch);

    play(1000);
    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    fireEvent.click(screen.getByRole("radio", { name: "2×" }));
    fireEvent.click(screen.getByRole("radio", { name: "0.5×" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset animation" }));
    play(500, 2000);
    // Give any (wrongly) scheduled debounced request time to fire.
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(waveFetch).toHaveBeenCalledTimes(1);
    expect(wakeFetch).toHaveBeenCalledTimes(1);
  });

  it("changing the swimming speed requests new physics and speeds up the duck", async () => {
    const { wakeFetch, waveFetch } = setup();
    await settled(waveFetch, wakeFetch);

    const now = play(250);
    const slowOffset = Math.abs(markOffset());
    expect(slowOffset).toBeCloseTo(1.2 * 0.25, 1);

    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "2.4" },
    });
    await waitFor(() => {
      expect(waveFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("animation-hint")).toHaveTextContent("2.40 m/s");
    });
    expect(bodyOf(waveFetch.mock.calls[1] ?? [])).toEqual({
      duck_length_m: 0.55,
      swimming_speed_m_s: 2.4,
    });

    // Continues from where it was (no teleport), now at twice the rate.
    const before = markOffset();
    expect(before).toBeCloseTo(-slowOffset, 6);
    play(250, now);
    expect(Math.abs(markOffset() - before)).toBeCloseTo(2.4 * 0.25, 1);
  });

  it("changing the species updates the physical parameters and the duck size", async () => {
    const { wakeFetch, waveFetch } = setup();
    await settled(waveFetch, wakeFetch);
    expect(screen.getByTestId("wave-duck")).toHaveAttribute("transform", "scale(0.55)");

    fireEvent.change(screen.getByLabelText("Duck species"), {
      target: { value: "teal" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("wave-duck")).toHaveAttribute(
        "transform",
        "scale(0.35)",
      );
    });
    expect(bodyOf(waveFetch.mock.calls.at(-1) ?? [])).toEqual({
      duck_length_m: 0.35,
      swimming_speed_m_s: 1.2,
    });
  });

  it("keeps animating after a physical parameter change", async () => {
    const { wakeFetch, waveFetch } = setup();
    await settled(waveFetch, wakeFetch);
    const now = play(200);

    fireEvent.change(screen.getByLabelText("Duck length"), {
      target: { value: "0.80" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("wave-duck")).toHaveAttribute("transform", "scale(0.8)");
    });
    const before = markOffset();
    play(200, now);
    expect(markOffset()).not.toBe(before);
    expect(screen.getByRole("button", { name: "Pause animation" })).toBeInTheDocument();
  });

  it("a stale wave response cannot overwrite newer parameters", async () => {
    let releaseStale: (value: unknown) => void = () => undefined;
    const waveFetch = vi.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as WaveBody;
      const response = mockJsonResponse(
        makeAnimatedWaveFieldResponse({
          duck_length_m: body.duck_length_m,
          swimming_speed_m_s: body.swimming_speed_m_s,
        }),
      );
      if (body.swimming_speed_m_s === 2) {
        // Never settles until released, and ignores the abort signal.
        return new Promise((resolve) => {
          releaseStale = () => resolve(response);
        });
      }
      return Promise.resolve(response);
    });
    const wakeFetch = vi.fn().mockResolvedValue(mockJsonResponse(makeWakeResponse()));
    stubRoutedFetch(wakeFetch, waveFetch);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("wave-svg")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "2.0" },
    });
    await waitFor(() => {
      expect(waveFetch).toHaveBeenCalledTimes(2);
    });
    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "2.5" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("animation-hint")).toHaveTextContent("2.50 m/s");
    });

    await act(async () => {
      releaseStale(undefined);
      await Promise.resolve();
    });
    expect(screen.getByTestId("animation-hint")).toHaveTextContent("2.50 m/s");
    expect(screen.getByTestId("animation-hint")).not.toHaveTextContent("2.00 m/s");
  });

  it("cancels its animation frame when the app unmounts", async () => {
    const { wakeFetch, waveFetch, unmount } = setup();
    await settled(waveFetch, wakeFetch);
    play(100);
    expect(fake.pending()).toBe(1);

    unmount();
    expect(fake.pending()).toBe(0);
    expect(fake.cancelSpy).toHaveBeenCalled();
    // A late frame is a no-op (no callback is left registered).
    expect(() => fake.flush(10_000)).not.toThrow();
  });

  it("starts paused with reduced motion and the user can opt in", async () => {
    stubReducedMotion(true);
    const { wakeFetch, waveFetch } = setup();
    await settled(waveFetch, wakeFetch);

    expect(fake.pending()).toBe(0);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
    expect(markOffset()).toBeCloseTo(0, 9);

    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    play(300);
    expect(markOffset()).not.toBeCloseTo(0, 3);
  });

  it("playback controls work from the keyboard", async () => {
    const user = userEvent.setup();
    const { wakeFetch, waveFetch } = setup();
    await settled(waveFetch, wakeFetch);

    const toggle = screen.getByRole("button", { name: "Pause animation" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Play animation" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pause animation" })).toHaveFocus();

    const reset = screen.getByRole("button", { name: "Reset animation" });
    play(200);
    reset.focus();
    await user.keyboard("{Enter}");
    expect(markOffset()).toBeCloseTo(0, 9);
  });
});
