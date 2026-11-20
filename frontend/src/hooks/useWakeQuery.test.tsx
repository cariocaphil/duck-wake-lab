import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeQuery } from "./useWakeQuery";
import { makeWakeResponse } from "../test/wakeFixtures";
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => wake,
    });
    vi.stubGlobal("fetch", fetchMock);

    const initial: WakeControlValues = { duckLengthM: 0.5, speedMS: 1.2 };
    const { result } = renderHook(() => useWakeQuery(initial));

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.wake).toEqual(wake);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wake",
      expect.objectContaining({
        body: JSON.stringify({ duck_length_m: 0.5, speed_m_s: 1.2 }),
      }),
    );
  });

  it("aborts an in-flight request as soon as inputs change", async () => {
    vi.useFakeTimers();

    const signals: AbortSignal[] = [];
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
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

      return Promise.resolve({
        ok: true,
        json: async () =>
          makeWakeResponse({ speed_m_s: 2.0, froude_number: 0.9 }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook(({ values }) => useWakeQuery(values), {
      initialProps: { values: { duckLengthM: 0.5, speedMS: 1.0 } },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAKE_FETCH_DEBOUNCE_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    rerender({ values: { duckLengthM: 0.5, speedMS: 2.0 } });

    expect(signals[0]?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAKE_FETCH_DEBOUNCE_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({ duck_length_m: 0.5, speed_m_s: 2.0 }),
      }),
    );
  });

  it("surfaces API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: "boom" }),
      }),
    );

    const initial: WakeControlValues = { duckLengthM: 0.5, speedMS: 1.2 };
    const { result } = renderHook(() => useWakeQuery(initial));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.error).toMatch(/500/);
    });
  });
});
