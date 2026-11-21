import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_FRAME_DT_S,
  type SimulationRates,
  type SimulationState,
} from "../animation/simulation";
import {
  installFakeFrames,
  setDocumentHidden,
  stubReducedMotion,
  type FakeFrames,
} from "../test/animationFrames";
import { useWakeAnimation } from "./useWakeAnimation";

const RATES: SimulationRates = {
  swimmingSpeedMS: 2,
  omegaT: 10,
  omegaD: 20,
  strokeRadS: 5,
};

let frames: FakeFrames;

beforeEach(() => {
  frames = installFakeFrames();
});

afterEach(() => {
  setDocumentHidden(false);
  frames.restore();
  vi.restoreAllMocks();
});

function setup(rates: SimulationRates | null = RATES) {
  const onFrame = vi.fn<(state: SimulationState) => void>();
  const view = renderHook(
    (props: { rates: SimulationRates | null }) =>
      useWakeAnimation({ rates: props.rates, onFrame }),
    { initialProps: { rates } },
  );
  return { ...view, onFrame };
}

/** Flush frames at 0, 100/6 ms, ... covering `totalMs` of real time. */
function playFor(totalMs: number, stepMs = 1000 / 60, startMs = 0): number {
  let now = startMs;
  act(() => frames.flush(now)); // baseline frame
  const count = Math.round(totalMs / stepMs);
  for (let i = 0; i < count; i += 1) {
    now += stepMs;
    act(() => frames.flush(now));
  }
  return now;
}

describe("useWakeAnimation: timing", () => {
  it("starts playing and advances time from timestamp deltas", () => {
    const { result } = setup();
    expect(result.current.playing).toBe(true);
    playFor(1000);
    expect(result.current.stateRef.current.timeS).toBeCloseTo(1, 6);
  });

  it("applies the 0.5x / 1x / 2x multipliers to simulation time", () => {
    const { result } = setup();
    for (const [speed, expected] of [
      [0.5, 0.5],
      [2, 2],
    ] as const) {
      act(() => result.current.reset());
      act(() => result.current.setSpeed(speed));
      playFor(1000);
      expect(result.current.stateRef.current.timeS).toBeCloseTo(expected, 6);
    }
  });

  it("is frame-rate independent", () => {
    const at60 = setup();
    playFor(1000, 1000 / 60);
    const t60 = at60.result.current.stateRef.current;
    at60.unmount();

    const at30 = setup();
    playFor(1000, 1000 / 30);
    const t30 = at30.result.current.stateRef.current;

    expect(t30.timeS).toBeCloseTo(t60.timeS, 6);
    expect(t30.distanceM).toBeCloseTo(t60.distanceM, 6);
    expect(t30.phaseT).toBeCloseTo(t60.phaseT, 6);
  });

  it("does not advance without physics rates", () => {
    const { result, onFrame } = setup(null);
    playFor(500);
    expect(result.current.stateRef.current.timeS).toBe(0);
    expect(onFrame).not.toHaveBeenCalled();
  });

  it("calls onFrame without re-rendering the hook consumer each frame", () => {
    const renders = vi.fn();
    const onFrame = vi.fn();
    renderHook(() => {
      renders();
      return useWakeAnimation({ rates: RATES, onFrame });
    });
    const rendersBefore = renders.mock.calls.length;
    playFor(500);
    expect(onFrame.mock.calls.length).toBeGreaterThan(20);
    expect(renders.mock.calls.length).toBe(rendersBefore);
  });
});

describe("useWakeAnimation: pause, resume, reset", () => {
  it("pausing freezes time and duck distance and leaves no pending frame", () => {
    const { result } = setup();
    const now = playFor(500);
    act(() => result.current.togglePlaying());
    expect(result.current.playing).toBe(false);
    expect(frames.pending()).toBe(0);

    const frozen = result.current.stateRef.current;
    act(() => frames.flush(now + 5000));
    expect(result.current.stateRef.current).toEqual(frozen);
  });

  it("resuming after a long pause does not jump", () => {
    const { result } = setup();
    const now = playFor(500);
    act(() => result.current.togglePlaying());
    const before = result.current.stateRef.current.timeS;

    act(() => result.current.togglePlaying());
    // First frame after resume only re-baselines, even 60 s later.
    act(() => frames.flush(now + 60_000));
    expect(result.current.stateRef.current.timeS).toBe(before);
    act(() => frames.flush(now + 60_000 + 16));
    expect(result.current.stateRef.current.timeS - before).toBeCloseTo(0.016, 6);
  });

  it("clamps a single huge frame gap while playing", () => {
    const { result } = setup();
    act(() => frames.flush(0));
    act(() => frames.flush(30_000));
    expect(result.current.stateRef.current.timeS).toBeCloseTo(MAX_FRAME_DT_S, 9);
  });

  it("reset returns time, distance and phase to zero and redraws", () => {
    const { result, onFrame } = setup();
    playFor(500);
    expect(result.current.stateRef.current.distanceM).toBeGreaterThan(0);
    onFrame.mockClear();

    act(() => result.current.reset());
    expect(result.current.stateRef.current).toEqual({
      timeS: 0,
      distanceM: 0,
      phaseT: 0,
      phaseD: 0,
      strokePhase: 0,
    });
    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it("reset keeps the playback speed and playing state", () => {
    const { result } = setup();
    act(() => result.current.setSpeed(2));
    act(() => result.current.reset());
    expect(result.current.speed).toBe(2);
    expect(result.current.playing).toBe(true);
  });

  it("keeps distance and phase when the rates change mid-swim", () => {
    const { result, rerender } = setup();
    const now = playFor(500);
    const before = result.current.stateRef.current;
    rerender({ rates: { ...RATES, swimmingSpeedMS: 3, omegaT: 30 } });
    act(() => frames.flush(now + 10));
    const after = result.current.stateRef.current;
    expect(after.distanceM - before.distanceM).toBeCloseTo(3 * 0.01, 6);
    expect(after.phaseT - before.phaseT).toBeCloseTo(30 * 0.01, 6);
  });
});

describe("useWakeAnimation: lifecycle", () => {
  it("cancels the pending frame on unmount", () => {
    const { unmount } = setup();
    expect(frames.pending()).toBe(1);
    unmount();
    expect(frames.pending()).toBe(0);
    expect(frames.cancelSpy).toHaveBeenCalled();
  });

  it("does not run callbacks after unmount", () => {
    const { unmount, onFrame } = setup();
    playFor(100);
    unmount();
    onFrame.mockClear();
    frames.flush(10_000);
    expect(onFrame).not.toHaveBeenCalled();
  });

  it("suspends frames while the page is hidden and resumes without a jump", () => {
    const { result } = setup();
    const now = playFor(300);
    const before = result.current.stateRef.current.timeS;

    act(() => setDocumentHidden(true));
    expect(frames.pending()).toBe(0);
    expect(result.current.playing).toBe(true); // state is kept

    act(() => setDocumentHidden(false));
    expect(frames.pending()).toBe(1);
    act(() => frames.flush(now + 120_000));
    expect(result.current.stateRef.current.timeS).toBe(before);
    act(() => frames.flush(now + 120_016));
    expect(result.current.stateRef.current.timeS - before).toBeCloseTo(0.016, 6);
  });

  it("removes its visibility listener on unmount", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = setup();
    unmount();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});

describe("useWakeAnimation: reduced motion", () => {
  it("starts paused when reduced motion is requested and lets the user opt in", () => {
    stubReducedMotion(true);
    const { result } = setup();
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.playing).toBe(false);
    expect(frames.pending()).toBe(0);

    act(() => result.current.togglePlaying());
    expect(result.current.playing).toBe(true);
    playFor(200);
    expect(result.current.stateRef.current.timeS).toBeGreaterThan(0.15);
  });

  it("plays by default when reduced motion is not requested", () => {
    stubReducedMotion(false);
    const { result } = setup();
    expect(result.current.reducedMotion).toBe(false);
    expect(result.current.playing).toBe(true);
  });
});
