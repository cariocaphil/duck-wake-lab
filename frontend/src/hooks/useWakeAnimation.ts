import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ANIMATION_SPEED,
  advanceSimulation,
  frameDeltaS,
  initialSimulationState,
  type AnimationSpeed,
  type SimulationRates,
  type SimulationState,
} from "../animation/simulation";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function reducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

export interface UseWakeAnimationOptions {
  /**
   * Rates from the latest physics response, or null while there is no data.
   * Time does not advance without rates.
   */
  rates: SimulationRates | null;
  /**
   * Imperative render callback. Called on every frame while playing and on
   * reset; it must draw from the state it receives (no React state updates).
   */
  onFrame: (state: SimulationState) => void;
}

export interface WakeAnimationControls {
  playing: boolean;
  speed: AnimationSpeed;
  /** True when the OS asked for reduced motion (animation starts paused). */
  reducedMotion: boolean;
  togglePlaying: () => void;
  setSpeed: (speed: AnimationSpeed) => void;
  /** Return time, distance and paddling phase to zero; species/physics are untouched. */
  reset: () => void;
  /** Latest simulation state. Read it from render callbacks, not from render. */
  stateRef: { readonly current: SimulationState };
}

/**
 * `requestAnimationFrame` loop for the swimming duck.
 *
 * - Time comes from frame timestamp deltas (refresh-rate independent) and is
 *   clamped, scaled by the playback speed, and integrated in a ref. Frames do
 *   not cause React renders; only play/pause/speed changes do.
 * - The first frame after play, resume or the tab becoming visible only sets
 *   the timestamp baseline, so resuming never produces a time jump.
 * - While paused, hidden or unmounted no frame is pending.
 * - With `prefers-reduced-motion: reduce` the animation starts paused and the
 *   user can opt in with Play. It never fetches data.
 */
export function useWakeAnimation({
  rates,
  onFrame,
}: UseWakeAnimationOptions): WakeAnimationControls {
  const [reducedMotion] = useState(() => reducedMotionQuery()?.matches ?? false);
  const [playing, setPlaying] = useState(() => !reducedMotion);
  const [speed, setSpeedState] = useState<AnimationSpeed>(DEFAULT_ANIMATION_SPEED);

  const stateRef = useRef<SimulationState>(initialSimulationState());
  const ratesRef = useRef(rates);
  const onFrameRef = useRef(onFrame);
  const speedRef = useRef(speed);

  // Refs read by the frame loop always see the latest props without
  // restarting the loop.
  useEffect(() => {
    ratesRef.current = rates;
    onFrameRef.current = onFrame;
    speedRef.current = speed;
  });

  // Pause if the user turns reduced motion on while the page is open.
  useEffect(() => {
    const query = reducedMotionQuery();
    if (query === null) {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setPlaying(false);
      }
    };
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!playing) {
      return;
    }

    let frameId: number | null = null;
    let lastTimestampMs: number | null = null;

    const tick = (timestampMs: number) => {
      frameId = null;
      const currentRates = ratesRef.current;
      if (lastTimestampMs !== null && currentRates !== null) {
        const dt = frameDeltaS(lastTimestampMs, timestampMs);
        stateRef.current = advanceSimulation(
          stateRef.current,
          dt,
          speedRef.current,
          currentRates,
        );
        onFrameRef.current(stateRef.current);
      }
      lastTimestampMs = timestampMs;
      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (frameId === null) {
        lastTimestampMs = null; // re-baseline: no time jump after a gap
        frameId = window.requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!document.hidden) {
      start();
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [playing]);

  const togglePlaying = useCallback(() => {
    setPlaying((current) => !current);
  }, []);

  const setSpeed = useCallback((next: AnimationSpeed) => {
    setSpeedState(next);
  }, []);

  const reset = useCallback(() => {
    stateRef.current = initialSimulationState();
    onFrameRef.current(stateRef.current);
  }, []);

  return { playing, speed, reducedMotion, togglePlaying, setSpeed, reset, stateRef };
}
