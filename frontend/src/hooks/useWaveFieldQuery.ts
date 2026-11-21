import { useMemo } from "react";
import {
  fetchWaveField,
  type WaveFieldRequest,
  type WaveFieldResponse,
} from "../api/wakeClient";
import { useDebouncedQuery } from "./useDebouncedQuery";

export interface WaveFieldQueryState {
  waveField: WaveFieldResponse | null;
  error: string | null;
  loading: boolean;
}

export interface WaveFieldQueryInput {
  duckLengthM: number;
  speedMS: number;
}

function sameRequest(a: WaveFieldRequest, b: WaveFieldRequest): boolean {
  return (
    a.duck_length_m === b.duck_length_m &&
    a.swimming_speed_m_s === b.swimming_speed_m_s
  );
}

/**
 * Debounced wave-field fetch. The request depends only on duck length and
 * swimming speed: the selected wave family and the Kelvin/Advanced mode are
 * not inputs, so changing them never triggers a request.
 */
export function useWaveFieldQuery({
  duckLengthM,
  speedMS,
}: WaveFieldQueryInput): WaveFieldQueryState {
  const request = useMemo<WaveFieldRequest>(
    () => ({
      duck_length_m: duckLengthM,
      swimming_speed_m_s: speedMS,
    }),
    [duckLengthM, speedMS],
  );

  const { data, error, loading } = useDebouncedQuery({
    request,
    fetcher: fetchWaveField,
    sameRequest,
    fallbackError: "Failed to load wave field",
  });

  return { waveField: data, error, loading };
}
