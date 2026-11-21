import { useEffect, useRef, useState } from "react";
import { WAKE_FETCH_DEBOUNCE_MS } from "../types";

export interface DebouncedQueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface DebouncedQueryOptions<R, T> {
  /** Stable (memoized) request; a new identity restarts the debounce. */
  request: R;
  fetcher: (request: R, signal: AbortSignal) => Promise<T>;
  /** Structural equality used for the stale-response guard. */
  sameRequest: (a: R, b: R) => boolean;
  /** Message used when a failure is not an Error instance. */
  fallbackError: string;
}

/**
 * Debounced fetch with abort-on-change and stale-response protection.
 * Delay is 0 until the first successful settle; after that always
 * WAKE_FETCH_DEBOUNCE_MS. Previous data is kept while an update is loading and
 * cleared on failure.
 */
export function useDebouncedQuery<R, T>({
  request,
  fetcher,
  sameRequest,
  fallbackError,
}: DebouncedQueryOptions<R, T>): DebouncedQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef<R>(request);
  const hasSucceededRef = useRef(false);

  useEffect(() => {
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
          const result = await fetcher(request, controller.signal);
          if (controller.signal.aborted) {
            return;
          }
          if (!sameRequest(request, latestRequestRef.current)) {
            return;
          }
          hasSucceededRef.current = true;
          setData(result);
          setLoading(false);
          setError(null);
        } catch (err) {
          if (controller.signal.aborted) {
            return;
          }
          if (!sameRequest(request, latestRequestRef.current)) {
            return;
          }
          setData(null);
          setLoading(false);
          setError(err instanceof Error ? err.message : fallbackError);
        }
      })();
    }, delay);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [request, fetcher, sameRequest, fallbackError]);

  return { data, error, loading };
}
