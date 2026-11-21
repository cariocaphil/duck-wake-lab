import { useEffect, useRef, useState } from "react";
import {
  fetchWake,
  WakeApiError,
  type WakeRequest,
  type WakeResponse,
} from "../api/wakeClient";
import { WAKE_FETCH_DEBOUNCE_MS, type WakeControlValues } from "../types";

export interface WakeQueryState {
  wake: WakeResponse | null;
  error: string | null;
  loading: boolean;
}

function sameRequest(a: WakeRequest, b: WakeRequest): boolean {
  return (
    a.duck_length_m === b.duck_length_m &&
    a.swimming_speed_m_s === b.swimming_speed_m_s &&
    a.physics_mode === b.physics_mode
  );
}

function toErrorMessage(err: unknown): string {
  if (err instanceof WakeApiError || err instanceof Error) {
    return err.message;
  }
  return "Failed to load wake geometry";
}

/**
 * Debounced wake fetch with abort-on-input-change to avoid stale responses.
 * Delay is 0 until the first successful settle; after that always WAKE_FETCH_DEBOUNCE_MS.
 */
export function useWakeQuery({
  duckLengthM,
  speedMS,
  physicsMode,
}: WakeControlValues): WakeQueryState {
  const [wake, setWake] = useState<WakeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef<WakeRequest>({
    duck_length_m: duckLengthM,
    swimming_speed_m_s: speedMS,
    physics_mode: physicsMode,
  });
  const hasSucceededRef = useRef(false);

  useEffect(() => {
    const request: WakeRequest = {
      duck_length_m: duckLengthM,
      swimming_speed_m_s: speedMS,
      physics_mode: physicsMode,
    };
    latestRequestRef.current = request;

    // Abort any in-flight request immediately when inputs change.
    abortRef.current?.abort();
    abortRef.current = null;

    setLoading(true);
    setError(null);

    const delay = hasSucceededRef.current ? WAKE_FETCH_DEBOUNCE_MS : 0;

    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const result = await fetchWake(request, controller.signal);
          if (controller.signal.aborted) {
            return;
          }
          if (!sameRequest(request, latestRequestRef.current)) {
            return;
          }
          hasSucceededRef.current = true;
          setWake(result);
          setLoading(false);
          setError(null);
        } catch (err) {
          if (controller.signal.aborted) {
            return;
          }
          if (!sameRequest(request, latestRequestRef.current)) {
            return;
          }
          setWake(null);
          setLoading(false);
          setError(toErrorMessage(err));
        }
      })();
    }, delay);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [duckLengthM, speedMS, physicsMode]);

  return {
    wake,
    error,
    loading,
  };
}
