import { useMemo } from "react";
import {
  fetchWake,
  type WakeRequest,
  type WakeResponse,
} from "../api/wakeClient";
import { type WakeControlValues } from "../types";
import { useDebouncedQuery } from "./useDebouncedQuery";

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

/**
 * Debounced wake fetch with abort-on-input-change to avoid stale responses.
 * Delay is 0 until the first successful settle; after that always WAKE_FETCH_DEBOUNCE_MS.
 */
export function useWakeQuery({
  duckLengthM,
  speedMS,
  physicsMode,
}: WakeControlValues): WakeQueryState {
  const request = useMemo<WakeRequest>(
    () => ({
      duck_length_m: duckLengthM,
      swimming_speed_m_s: speedMS,
      physics_mode: physicsMode,
    }),
    [duckLengthM, speedMS, physicsMode],
  );

  const { data, error, loading } = useDebouncedQuery({
    request,
    fetcher: fetchWake,
    sameRequest,
    fallbackError: "Failed to load wake geometry",
  });

  return { wake: data, error, loading };
}
