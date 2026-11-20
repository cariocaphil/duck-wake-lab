import { useEffect, useRef, useState } from "react";
import { fetchWake, WakeApiError } from "../api/wakeClient";
import type { WakeRequest, WakeResponse } from "../api/types";
import { WAKE_FETCH_DEBOUNCE_MS, type WakeControlValues } from "../types";

export type WakeQueryStatus = "idle" | "loading" | "success" | "error";

export interface WakeQueryState {
  wake: WakeResponse | null;
  status: WakeQueryStatus;
  error: string | null;
  loading: boolean;
}

function toRequest(values: WakeControlValues): WakeRequest {
  return {
    duck_length_m: values.duckLengthM,
    speed_m_s: values.speedMS,
  };
}

function sameRequest(a: WakeRequest, b: WakeRequest): boolean {
  return a.duck_length_m === b.duck_length_m && a.speed_m_s === b.speed_m_s;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof WakeApiError || err instanceof Error) {
    return err.message;
  }
  return "Failed to load wake geometry";
}

/**
 * Debounced wake fetch with abort-on-input-change to avoid stale responses.
 */
export function useWakeQuery(values: WakeControlValues): WakeQueryState {
  const [wake, setWake] = useState<WakeResponse | null>(null);
  const [status, setStatus] = useState<WakeQueryStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef<WakeRequest>(toRequest(values));

  useEffect(() => {
    const request = toRequest(values);
    latestRequestRef.current = request;

    // Abort any in-flight request immediately when inputs change.
    abortRef.current?.abort();
    abortRef.current = null;

    setStatus("loading");
    setError(null);

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
          setWake(result);
          setStatus("success");
          setError(null);
        } catch (err) {
          if (controller.signal.aborted) {
            return;
          }
          if (!sameRequest(request, latestRequestRef.current)) {
            return;
          }
          setWake(null);
          setStatus("error");
          setError(toErrorMessage(err));
        }
      })();
    }, WAKE_FETCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // Intentionally depend on primitives only — a new `values` object each
    // render would retrigger the effect and reset the debounced request.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [values.duckLengthM, values.speedMS]);

  return {
    wake,
    status,
    error,
    loading: status === "loading",
  };
}
