import { vi } from "vitest";

/** A spy-backed stand-in for CanvasRenderingContext2D, for asserting draw calls. */
export function createMockCanvasContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    lineWidth: 1,
  };
}

export type MockCanvasContext = ReturnType<typeof createMockCanvasContext>;

export function asCanvasContext(
  mock: MockCanvasContext,
): CanvasRenderingContext2D {
  return mock as unknown as CanvasRenderingContext2D;
}

/**
 * Makes every canvas return the given mock context.
 * Call `vi.restoreAllMocks()` (e.g. in afterEach) to undo.
 */
export function mockCanvasGetContext(mock: MockCanvasContext) {
  return vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => asCanvasContext(mock));
}
