import { vi } from "vitest";

/**
 * Deterministic `requestAnimationFrame` for tests: callbacks only run when
 * `flush(timestampMs)` is called, so no real time is involved.
 */
export interface FakeFrames {
  /** Run all callbacks queued so far with this timestamp (ms). */
  flush: (timestampMs: number) => void;
  /** Number of callbacks currently waiting to run. */
  pending: () => number;
  requestSpy: ReturnType<typeof vi.fn>;
  cancelSpy: ReturnType<typeof vi.fn>;
  restore: () => void;
}

export function installFakeFrames(): FakeFrames {
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();

  const requestSpy = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    queue.set(id, callback);
    return id;
  });
  const cancelSpy = vi.fn((id: number) => {
    queue.delete(id);
  });

  vi.stubGlobal("requestAnimationFrame", requestSpy);
  vi.stubGlobal("cancelAnimationFrame", cancelSpy);

  return {
    flush(timestampMs) {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) {
        callback(timestampMs);
      }
    },
    pending: () => queue.size,
    requestSpy,
    cancelSpy,
    restore() {
      vi.unstubAllGlobals();
    },
  };
}

/** Make `document.hidden` report a value and fire `visibilitychange`. */
export function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Stub `window.matchMedia` so `prefers-reduced-motion: reduce` matches. */
export function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  }));
}
