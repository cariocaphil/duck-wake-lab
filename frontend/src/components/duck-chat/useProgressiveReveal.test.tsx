import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProgressiveReveal } from "./useProgressiveReveal";

afterEach(() => {
  vi.useRealTimers();
});

describe("useProgressiveReveal", () => {
  it("reveals text over time and reports isRevealing", async () => {
    vi.useFakeTimers();
    const onRevealed = vi.fn();
    const { result } = renderHook(() =>
      useProgressiveReveal({
        messageId: "a1",
        text: "ABCDEFGHIJ",
        active: true,
        reducedMotion: false,
        alreadyRevealed: false,
        onRevealed,
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
    expect(onRevealed).toHaveBeenCalledTimes(1);
    expect(onRevealed).toHaveBeenCalledWith("a1");
  });

  it("shows full text immediately under reduced motion", () => {
    const onRevealed = vi.fn();
    const { result } = renderHook(() =>
      useProgressiveReveal({
        messageId: "a1",
        text: "Full now",
        active: true,
        reducedMotion: true,
        alreadyRevealed: false,
        onRevealed,
      }),
    );
    expect(result.current.displayed).toBe("Full now");
    expect(result.current.isRevealing).toBe(false);
    expect(onRevealed).toHaveBeenCalledWith("a1");
  });

  it("shows full text immediately when alreadyRevealed", () => {
    const onRevealed = vi.fn();
    const { result } = renderHook(() =>
      useProgressiveReveal({
        messageId: "a1",
        text: "Already seen",
        active: true,
        reducedMotion: false,
        alreadyRevealed: true,
        onRevealed,
      }),
    );
    expect(result.current.displayed).toBe("Already seen");
    expect(result.current.isRevealing).toBe(false);
    expect(onRevealed).toHaveBeenCalledWith("a1");
  });

  it("restarts reveal when messageId changes even if text is identical", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ messageId }) =>
        useProgressiveReveal({
          messageId,
          text: "Same text",
          active: true,
          reducedMotion: false,
          alreadyRevealed: false,
          charsPerTick: 2,
          tickMs: 20,
        }),
      { initialProps: { messageId: "msg-1" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.displayed).toBe("Same text");
    expect(result.current.isRevealing).toBe(false);

    rerender({ messageId: "msg-2" });
    expect(result.current.isRevealing).toBe(true);
    expect(result.current.displayed.length).toBeLessThan("Same text".length);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.displayed).toBe("Same text");
    expect(result.current.isRevealing).toBe(false);
  });

  it("stops when inactive (e.g. loading)", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) =>
        useProgressiveReveal({
          messageId: "a1",
          text: "Hello world",
          active,
          reducedMotion: false,
          alreadyRevealed: false,
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
