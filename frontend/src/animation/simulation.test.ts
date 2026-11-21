import { describe, expect, it } from "vitest";
import {
  ANIMATION_SPEEDS,
  MAX_FRAME_DT_S,
  advanceSimulation,
  frameDeltaS,
  initialSimulationState,
  isAnimationSpeed,
  ratesFromWaveField,
  waterMarkOffsetM,
  type SimulationRates,
  type SimulationState,
} from "./simulation";

const RATES: SimulationRates = {
  swimmingSpeedMS: 1.5,
  strokeRadS: 10,
};

/** Step `totalS` real seconds in equal frames of `frameS`. */
function run(
  totalS: number,
  frameS: number,
  speed = 1,
  rates = RATES,
): SimulationState {
  let state = initialSimulationState();
  const frames = Math.round(totalS / frameS);
  for (let i = 0; i < frames; i += 1) {
    state = advanceSimulation(state, frameS, speed, rates);
  }
  return state;
}

describe("frameDeltaS", () => {
  it("converts millisecond timestamps to seconds", () => {
    expect(frameDeltaS(1000, 1016)).toBeCloseTo(0.016, 10);
  });

  it("never returns negative or non-finite deltas", () => {
    expect(frameDeltaS(2000, 1000)).toBe(0);
    expect(frameDeltaS(1000, 1000)).toBe(0);
    expect(frameDeltaS(0, Number.NaN)).toBe(0);
  });

  it("clamps long gaps so a stalled tab cannot cause a large jump", () => {
    expect(frameDeltaS(0, 60_000)).toBe(MAX_FRAME_DT_S);
  });
});

describe("advanceSimulation: timing", () => {
  it("advances elapsed time by the frame delta", () => {
    const state = advanceSimulation(initialSimulationState(), 0.25, 1, RATES);
    expect(state.timeS).toBeCloseTo(0.25, 12);
  });

  it("scales simulation time by the animation speed multiplier", () => {
    expect(ANIMATION_SPEEDS).toEqual([0.5, 1, 2]);
    expect(run(1, 0.01, 0.5).timeS).toBeCloseTo(0.5, 9);
    expect(run(1, 0.01, 1).timeS).toBeCloseTo(1, 9);
    expect(run(1, 0.01, 2).timeS).toBeCloseTo(2, 9);
  });

  it("does not advance for a zero delta (paused or first frame)", () => {
    const start = initialSimulationState();
    expect(advanceSimulation(start, 0, 1, RATES)).toEqual(start);
  });

  it("is independent of frame rate (60 Hz vs 30 Hz vs 144 Hz)", () => {
    const at60 = run(2, 1 / 60);
    const at30 = run(2, 1 / 30);
    const at144 = run(2, 1 / 144);
    for (const other of [at30, at144]) {
      expect(other.timeS).toBeCloseTo(at60.timeS, 9);
      expect(other.distanceM).toBeCloseTo(at60.distanceM, 9);
      expect(other.strokePhase).toBeCloseTo(at60.strokePhase, 9);
    }
  });

  it("does not mutate the previous state", () => {
    const start = initialSimulationState();
    advanceSimulation(start, 1, 1, RATES);
    expect(start).toEqual(initialSimulationState());
  });
});

describe("advanceSimulation: duck movement", () => {
  it("moves the duck by speed x elapsed simulation time", () => {
    const state = run(2, 0.01);
    expect(state.distanceM).toBeCloseTo(1.5 * 2, 9);
  });

  it("covers twice the distance at 2x playback but never changes speed", () => {
    expect(run(1, 0.01, 2).distanceM).toBeCloseTo(2 * run(1, 0.01, 1).distanceM, 9);
    expect(RATES.swimmingSpeedMS).toBe(1.5);
  });

  it("does not translate at zero swimming speed", () => {
    const state = run(2, 0.01, 1, { ...RATES, swimmingSpeedMS: 0 });
    expect(state.distanceM).toBe(0);
    expect(state.timeS).toBeCloseTo(2, 9);
  });

  it("does not teleport when the swimming speed changes mid-swim", () => {
    let state = initialSimulationState();
    state = advanceSimulation(state, 1, 1, RATES);
    const before = state.distanceM;
    state = advanceSimulation(state, 0.01, 1, { ...RATES, swimmingSpeedMS: 3 });
    expect(state.distanceM - before).toBeCloseTo(0.03, 9);
  });

  it("restores the initial state on reset", () => {
    const moved = run(1, 0.05);
    expect(moved.distanceM).toBeGreaterThan(0);
    expect(initialSimulationState()).toEqual({
      timeS: 0,
      distanceM: 0,
      strokePhase: 0,
    });
  });
});

describe("ratesFromWaveField", () => {
  const source = {
    swimming_speed_m_s: 1.2,
    froude_number: 0.5,
  };

  it("passes swimming speed through unchanged", () => {
    expect(ratesFromWaveField(source).swimmingSpeedMS).toBe(1.2);
  });

  it("paddles faster with Froude number, capped, and not at all when still", () => {
    const slow = ratesFromWaveField({ ...source, froude_number: 0.1 });
    const fast = ratesFromWaveField({ ...source, froude_number: 1.5 });
    const faster = ratesFromWaveField({ ...source, froude_number: 5 });
    expect(fast.strokeRadS).toBeGreaterThan(slow.strokeRadS);
    expect(faster.strokeRadS).toBeCloseTo(2 * Math.PI * 3, 9);
    expect(
      ratesFromWaveField({ ...source, swimming_speed_m_s: 0 }).strokeRadS,
    ).toBe(0);
  });
});

describe("waterMarkOffsetM", () => {
  it("wraps distance into [0, spacing)", () => {
    expect(waterMarkOffsetM(0, 0.5)).toBe(0);
    expect(waterMarkOffsetM(1.2, 0.5)).toBeCloseTo(0.2, 12);
    expect(waterMarkOffsetM(-0.1, 0.5)).toBeCloseTo(0.4, 12);
  });

  it("is zero for a non-positive spacing", () => {
    expect(waterMarkOffsetM(3, 0)).toBe(0);
  });
});

describe("isAnimationSpeed", () => {
  it("accepts only the offered multipliers", () => {
    expect(isAnimationSpeed(0.5)).toBe(true);
    expect(isAnimationSpeed(3)).toBe(false);
  });
});
