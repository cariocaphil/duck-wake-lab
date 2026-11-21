import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeQuery } from "./useWakeQuery";
import {
  expectPostedWake,
  makeAdvancedWakeResponse,
  makeWakeResponse,
  mockJsonResponse,
} from "../test/wakeFixtures";
import { WAKE_FETCH_DEBOUNCE_MS, type WakeControlValues } from "../types";

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useWakeQuery", () => {
  it("fetches wake geometry for the initial values", async () => {
    const wake = makeWakeResponse();
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(wake));
    vi.stubGlobal("fetch", fetchMock);

    const initial: WakeControlValues = {
      duckLengthM: 0.5,
      speedMS: 1.2,
      physicsMode: "kelvin",
    };
    const { result } = renderHook(() => useWakeQuery(initial));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.wake).toEqual(wake);
    });

    expect(result.current.error).toBeNull();
    expectPostedWake(fetchMock, {
      duck_length_m: 0.5,
      swimming_speed_m_s: 1.2,
    });
  });

  it("fires the first fetch after a 0ms timer flush, not the full debounce", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse(makeWakeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useWakeQuery({ duckLengthM: 0.5, speedMS: 1.2, physicsMode: "kelvin" as const }));

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight request as soon as inputs change", async () => {
    vi.useFakeTimers();

    const signals: AbortSignal[] = [];
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
      callCount += 1;
      const signal = init?.signal;
      if (signal) {
        signals.push(signal);
      }

      if (callCount === 1) {
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }

      return Promise.resolve(
        mockJsonResponse(makeWakeResponse({ froude_number: 0.9 })),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook(({ values }) => useWakeQuery(values), {
      initialProps: { values: { duckLengthM: 0.5, speedMS: 1.0, physicsMode: "kelvin" as const } },
    });

    // Pre-success: first fetch uses delay 0.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    rerender({ values: { duckLengthM: 0.5, speedMS: 2.0, physicsMode: "kelvin" as const } });

    expect(signals[0]?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Still pre-success (first request aborted), so second schedule is also delay 0.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectPostedWake(
      fetchMock,
      { duck_length_m: 0.5, swimming_speed_m_s: 2.0 },
      1,
    );
  });

  it("debounces after the first successful settle, including post-error refetches", async () => {
    vi.useFakeTimers();

    const wake = makeWakeResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(wake))
      .mockResolvedValueOnce(mockJsonResponse({ detail: "boom" }, 500))
      .mockResolvedValueOnce(
        mockJsonResponse(makeWakeResponse({ froude_number: 0.7 })),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ values }) => useWakeQuery(values),
      { initialProps: { values: { duckLengthM: 0.5, speedMS: 1.2, physicsMode: "kelvin" as const } } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.wake).toEqual(wake);
    expect(result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Post-success change: full debounce.
    rerender({ values: { duckLengthM: 0.8, speedMS: 1.2, physicsMode: "kelvin" as const } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAKE_FETCH_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.wake).toBeNull();
    expect(result.current.error).toMatch(/500/);

    // After error cleared wake, still debounced (hasSucceeded stays true).
    rerender({ values: { duckLengthM: 0.9, speedMS: 1.2, physicsMode: "kelvin" as const } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAKE_FETCH_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.wake?.froude_number).toBe(0.7);
  });

  it("surfaces API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ detail: "boom" }, 500)),
    );

    const initial: WakeControlValues = {
      duckLengthM: 0.5,
      speedMS: 1.2,
      physicsMode: "kelvin",
    };
    const { result } = renderHook(() => useWakeQuery(initial));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toMatch(/500/);
    });
    expect(result.current.wake).toBeNull();
  });

  it("clears wake when a later refetch fails", async () => {
    const wake = makeWakeResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(wake))
      .mockResolvedValueOnce(mockJsonResponse({ detail: "boom" }, 500));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ values }) => useWakeQuery(values),
      { initialProps: { values: { duckLengthM: 0.5, speedMS: 1.2, physicsMode: "kelvin" as const } } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.wake).toEqual(wake);
    });

    rerender({ values: { duckLengthM: 0.8, speedMS: 1.2, physicsMode: "kelvin" as const } });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.wake).toBeNull();
      expect(result.current.error).toMatch(/500/);
    });
  });
  it("includes physics_mode in the request and refetches when it changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(makeWakeResponse()))
      .mockResolvedValueOnce(mockJsonResponse(makeAdvancedWakeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ values }: { values: WakeControlValues }) => useWakeQuery(values),
      {
        initialProps: {
          values: {
            duckLengthM: 0.35,
            speedMS: 3.0,
            physicsMode: "kelvin",
          } as WakeControlValues,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.wake?.physics_mode).toBe("kelvin");
    });
    expectPostedWake(fetchMock, {
      duck_length_m: 0.35,
      swimming_speed_m_s: 3.0,
      physics_mode: "kelvin",
    });

    rerender({
      values: { duckLengthM: 0.35, speedMS: 3.0, physicsMode: "advanced" },
    });

    await waitFor(() => {
      expect(result.current.wake?.physics_mode).toBe("advanced");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectPostedWake(fetchMock, {
      duck_length_m: 0.35,
      swimming_speed_m_s: 3.0,
      physics_mode: "advanced",
    });
  });

  it("aborts the in-flight request and ignores its stale response when the mode changes", async () => {
    vi.useFakeTimers();

    const signals: AbortSignal[] = [];
    let resolveFirst: ((value: unknown) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: unknown, init?: RequestInit) => {
        if (init?.signal) {
          signals.push(init.signal);
        }
        if (fetchMock.mock.calls.length === 1) {
          // Ignores abort and resolves late, simulating a stale response.
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve(mockJsonResponse(makeAdvancedWakeResponse()));
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ values }: { values: WakeControlValues }) => useWakeQuery(values),
      {
        initialProps: {
          values: {
            duckLengthM: 0.35,
            speedMS: 3.0,
            physicsMode: "kelvin",
          } as WakeControlValues,
        },
      },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({
      values: { duckLengthM: 0.35, speedMS: 3.0, physicsMode: "advanced" },
    });
    expect(signals[0]?.aborted).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.wake?.physics_mode).toBe("advanced");

    // Late Kelvin response must not overwrite the newer advanced result.
    await act(async () => {
      resolveFirst?.(mockJsonResponse(makeWakeResponse()));
      await Promise.resolve();
    });
    expect(result.current.wake?.physics_mode).toBe("advanced");
  });
});
