/**
 * Pure animation clock for the swimming duck.
 *
 * Three concerns are kept apart:
 *  - physics: the spatial wake field and its parameters come from the API;
 *  - animation (this module): elapsed time, duck distance and paddling phase;
 *  - rendering: drawing the current state (WaveVisualization).
 *
 * Nothing here touches React, the DOM or the network.
 *
 * Coordinates. Distances are meters in the *world* frame: the duck starts at
 * world x = 0 and swims toward +x, so after time t it is at `distanceM`. The
 * renderer uses a following camera: the duck and its wake are drawn at fixed
 * *camera-relative* coordinates (duck at the origin, wake at x <= 0) and only
 * the world-fixed reference marks move, scrolling by `-distanceM`.
 *
 * Steady wake. Crests are stationary in the duck / camera frame (the PR #7
 * field is painted as-is). A traveling-phase term was deliberately not used:
 * evolving `A·cos(φ − ωt)` made crests drift astern relative to the duck,
 * the opposite of a real steady wake.
 *
 * Accumulators, not products. Distance and paddling phase are integrated
 * frame by frame (`distance += v * dt`) instead of computed as `v * t`.
 * Changing the swimming speed, duck length or species mid-swim therefore never
 * teleports the duck. A new wavelength can still change the crest appearance
 * abruptly; that is accepted and deliberately not smoothed.
 */

/** Playback multipliers offered by the UI. They never change physics. */
export const ANIMATION_SPEEDS = [0.5, 1, 2] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number];
export const DEFAULT_ANIMATION_SPEED: AnimationSpeed = 1;

export function isAnimationSpeed(value: number): value is AnimationSpeed {
  return ANIMATION_SPEEDS.some((speed) => speed === value);
}

/**
 * Longest frame delta (real seconds) that is simulated. A stalled or
 * throttled tab would otherwise produce one huge step.
 */
export const MAX_FRAME_DT_S = 0.1;

export interface SimulationState {
  /** Elapsed simulation time in seconds (real time x playback multiplier). */
  timeS: number;
  /** Distance swum along +x since the start or last reset, in meters. */
  distanceM: number;
  /** Accumulated paddling phase, radians (purely visual). */
  strokePhase: number;
}

/** Instantaneous rates that drive the accumulators, from the latest physics. */
export interface SimulationRates {
  /** Physical swimming speed in m/s (the duck's translational speed). */
  swimmingSpeedMS: number;
  /** Paddling angular rate in rad/s (visual only). */
  strokeRadS: number;
}

export const INITIAL_SIMULATION_STATE: SimulationState = {
  timeS: 0,
  distanceM: 0,
  strokePhase: 0,
};

export function initialSimulationState(): SimulationState {
  return { ...INITIAL_SIMULATION_STATE };
}

/**
 * Real seconds between two animation-frame timestamps (ms), clamped to
 * `[0, MAX_FRAME_DT_S]`. Using timestamp deltas makes the simulation
 * independent of the monitor refresh rate.
 */
export function frameDeltaS(previousMs: number, currentMs: number): number {
  const dt = (currentMs - previousMs) / 1000;
  if (!Number.isFinite(dt) || dt <= 0) {
    return 0;
  }
  return Math.min(dt, MAX_FRAME_DT_S);
}

/**
 * Advance the simulation by `realDtS` real seconds at the given playback
 * multiplier. The multiplier scales simulation time only; the physical rates
 * (m/s) are unchanged.
 */
export function advanceSimulation(
  state: SimulationState,
  realDtS: number,
  speedMultiplier: number,
  rates: SimulationRates,
): SimulationState {
  const dt = realDtS * speedMultiplier;
  if (!(dt > 0)) {
    return state;
  }
  return {
    timeS: state.timeS + dt,
    distanceM: state.distanceM + rates.swimmingSpeedMS * dt,
    strokePhase: state.strokePhase + rates.strokeRadS * dt,
  };
}

/** Longest paddling frequency (Hz), so strokes stay readable on screen. */
const MAX_STROKE_HZ = 3;
const BASE_STROKE_HZ = 1;
const STROKE_HZ_PER_FROUDE = 1.5;

/** The slice of the wave-field response the animation needs. */
export interface AnimationSource {
  swimming_speed_m_s: number;
  froude_number: number;
}

/**
 * Rates for the current physics. Paddling is a visual flourish: faster for
 * larger Froude number, capped, and absent when the duck is not moving.
 */
export function ratesFromWaveField(source: AnimationSource): SimulationRates {
  const moving = source.swimming_speed_m_s > 0;
  const strokeHz = Math.min(
    MAX_STROKE_HZ,
    BASE_STROKE_HZ + STROKE_HZ_PER_FROUDE * source.froude_number,
  );
  return {
    swimmingSpeedMS: source.swimming_speed_m_s,
    strokeRadS: moving ? 2 * Math.PI * strokeHz : 0,
  };
}

/**
 * Offset of the world-fixed reference marks in camera coordinates:
 * `distance mod spacing`, always in `[0, spacing)`. The marks sit at multiples
 * of `spacing` in the world, so their camera x is `k * spacing - offset`.
 */
export function waterMarkOffsetM(distanceM: number, spacingM: number): number {
  if (!(spacingM > 0)) {
    return 0;
  }
  return ((distanceM % spacingM) + spacingM) % spacingM;
}
