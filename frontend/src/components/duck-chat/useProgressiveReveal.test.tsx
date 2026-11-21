import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProgressiveReveal } from "./useProgressiveReveal";

afterEach(() => {
  vi.useRealTimers();
});

describe("useProgressiveReveal", () => {
  it("reveals text over time and reports isRevealing", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useProgressiveReveal({
        text: "ABCDEFGHIJ",
        active: true,
        reducedMotion: false,
        charsPerTick: 2,
        tickMs: 20,
      }),
    );

    expect(result.current.displayed).toBe("");
    expect(result.current.isRevealing).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(result.current.displayed).toBe("AB");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.displayed).toBe("ABCDEFGHIJ");
    expect(result.current.isRevealing).toBe(false);
  });

  it("shows full text immediately under reduced motion", () => {
    const { result } = renderHook(() =>
      useProgressiveReveal({
        text: "Full now",
        active: true,
        reducedMotion: true,
      }),
    );
    expect(result.current.displayed).toBe("Full now");
    expect(result.current.isRevealing).toBe(false);
  });

  it("stops when inactive (e.g. chat closed)", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) =>
        useProgressiveReveal({
          text: "Hello world",
          active,
          reducedMotion: false,
          charsPerTick: 1,
          tickMs: 10,
        }),
      { initialProps: { active: true } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    expect(result.current.displayed.length).toBeGreaterThan(0);

    rerender({ active: false });
    expect(result.current.displayed).toBe("");
    expect(result.current.isRevealing).toBe(false);
  });
});
