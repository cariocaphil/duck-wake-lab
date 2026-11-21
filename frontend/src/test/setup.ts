import "@testing-library/jest-dom/vitest";

// jsdom has no canvas implementation (getContext logs a "not implemented"
// error). Components must tolerate a missing 2D context; tests that inspect
// pixels install their own fake context.
HTMLCanvasElement.prototype.getContext = (() => null) as never;

// jsdom also lacks matchMedia; Speaking Duck uses prefers-reduced-motion.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
