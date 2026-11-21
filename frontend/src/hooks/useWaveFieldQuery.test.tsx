import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWaveFieldQuery } from "./useWaveFieldQuery";
import {
  makeWaveFieldResponse,
  mockJsonResponse,
} from "../test/wakeFixtures";
import { WAKE_FETCH_DEBOUNCE_MS } from "../types";

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function postedBody(fetchMock: { mock: { calls: unknown[][] } }, index = -1) {
  const calls = fetchMock.mock.calls;
  const call = calls.at(index) as [unknown, RequestInit] | undefined;
  expect(String(call?.[0])).toMatch(/\/api\/wave-field$/);
  return JSON.parse(String(call?.[1].body)) as Record<string, unknown>;
}

describe("useWaveFieldQuery", () => {
  it("fetches the wave field for length and speed only", async () => {
    const wave = makeWaveFieldResponse();
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(wave));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useWaveFieldQuery({ duckLengthM: 0.5, speedMS: 1.2 }),
    );
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.waveField).toEqual(wave);
    });
    expect(result.current.error).toBeNull();
    expect(postedBody(fetchMock)).toEqual({
      duck_length_m: 0.5,
      swimming_speed_m_s: 1.2,
    });
  });

  it("does not refetch when re-rendered with the same length and speed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse(makeWaveFieldResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      (props: { duckLengthM: number; speedMS: number }) =>
        useWaveFieldQuery(props),
      { initialProps: { duckLengthM: 0.5, speedMS: 1.2 } },
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ duckLengthM: 0.5, speedMS: 1.2 });
    rerender({ duckLengthM: 0.5, speedMS: 1.2 });
    await new Promise((resolve) => setTimeout(resolve, WAKE_FETCH_DEBOUNCE_MS + 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("debounces after the first success and aborts the superseded request", async () => {
    vi.useFakeTimers();

    const signals: AbortSignal[] = [];
    let call = 0;
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: unknown, init?: RequestInit) => {
        call += 1;
        if (init?.signal) {
          signals.push(init.signal);
        }
        if (call === 2) {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }
        return Promise.resolve(
          mockJsonResponse(makeWaveFieldResponse({ swimming_speed_m_s: 0.1 * call })),
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      (props: { duckLengthM: number; speedMS: number }) =>
        useWaveFieldQuery(props),
      { initialProps: { duckLengthM: 0.5, speedMS: 1.0 } },
    );

    // First fetch is not debounced.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.waveField).not.toBeNull();

    // After a success, changes wait for the full debounce.
    rerender({ duckLengthM: 0.5, speedMS: 2.0 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAKE_FETCH_DEBOUNCE_MS - 1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(postedBody(fetchMock)).toEqual({
      duck_length_m: 0.5,
      swimming_speed_m_s: 2.0,
    });

    // A newer change aborts the in-flight request immediately.
    rerender({ duckLengthM: 0.5, speedMS: 3.0 });
    expect(signals[1]?.aborted).toBe(true);
  });

  it("ignores a stale response that resolves after a newer request", async () => {
    let resolveStale: ((value: unknown) => void) | undefined;
    const fresh = makeWaveFieldResponse({ swimming_speed_m_s: 2.0 });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockResolvedValue(mockJsonResponse(fresh));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      (props: { duckLengthM: number; speedMS: number }) =>
        useWaveFieldQuery(props),
      { initialProps: { duckLengthM: 0.5, speedMS: 1.0 } },
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    rerender({ duckLengthM: 0.5, speedMS: 2.0 });
    await waitFor(() => {
      expect(result.current.waveField).toEqual(fresh);
    });

    // The abandoned request finishes late and must not overwrite the result.
    resolveStale?.(
      mockJsonResponse(makeWaveFieldResponse({ swimming_speed_m_s: 1.0 })),
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(result.current.waveField).toEqual(fresh);
    expect(result.current.loading).toBe(false);
  });

  it("surfaces API errors and clears the field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ detail: "boom" }, 500)),
    );
    const { result } = renderHook(() =>
      useWaveFieldQuery({ duckLengthM: 0.5, speedMS: 1.2 }),
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toMatch(/Wave-field request failed \(500\)/);
    });
    expect(result.current.waveField).toBeNull();
  });

  it("reports an invalid response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ nx: 3 })),
    );
    const { result } = renderHook(() =>
      useWaveFieldQuery({ duckLengthM: 0.5, speedMS: 1.2 }),
    );
    await waitFor(() => {
      expect(result.current.error).toBe("Invalid wave-field response");
    });
  });
});
