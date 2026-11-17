import "@testing-library/jest-dom/vitest";

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

class MockCanvasRenderingContext2D {
  fillStyle = "";
  strokeStyle = "";
  font = "";
  textAlign: CanvasTextAlign = "start";
  textBaseline: CanvasTextBaseline = "alphabetic";
  lineWidth = 1;

  clearRect(): void {}
  fillRect(): void {}
  beginPath(): void {}
  arc(): void {}
  ellipse(): void {}
  fill(): void {}
  stroke(): void {}
  moveTo(): void {}
  lineTo(): void {}
  closePath(): void {}
  fillText(): void {}
  strokeText(): void {}
  setTransform(): void {}
  measureText(): TextMetrics {
    return { width: 0 } as TextMetrics;
  }
}

HTMLCanvasElement.prototype.getContext = function getContext(
  this: HTMLCanvasElement,
  contextId: string,
): CanvasRenderingContext2D | null {
  if (contextId === "2d") {
    return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;
