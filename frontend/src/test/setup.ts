import "@testing-library/jest-dom/vitest";

// jsdom has no canvas implementation (getContext logs a "not implemented"
// error). Components must tolerate a missing 2D context; tests that inspect
// pixels install their own fake context.
HTMLCanvasElement.prototype.getContext = (() => null) as never;
