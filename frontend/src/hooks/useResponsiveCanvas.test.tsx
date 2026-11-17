import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockCanvasContext,
  mockCanvasGetContext,
  asCanvasContext,
  type MockCanvasContext,
} from "../test/mockCanvasContext";
import { useResponsiveCanvas, type DrawFunction } from "./useResponsiveCanvas";

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(public callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function Harness<T>({ state, draw }: { state: T; draw: DrawFunction<T> }) {
  const { canvasRef, containerRef } = useResponsiveCanvas(state, draw);
  return (
    <div ref={containerRef} data-testid="container">
      <canvas ref={canvasRef} data-testid="canvas" />
    </div>
  );
}

function mockContainerSize(width: number, height: number) {
  return vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ width, height } as DOMRect);
}

describe("useResponsiveCanvas", () => {
  let context: MockCanvasContext;

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.stubGlobal("devicePixelRatio", 2);
    context = createMockCanvasContext();
    mockCanvasGetContext(context);
    mockContainerSize(300, 200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sizes the canvas to its container, scaled by devicePixelRatio", () => {
    const { getByTestId } = render(<Harness state="a" draw={vi.fn()} />);
    const canvas = getByTestId("canvas") as HTMLCanvasElement;

    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(400);
    expect(canvas.style.width).toBe("300px");
    expect(canvas.style.height).toBe("200px");
  });

  it("paints on mount in CSS pixels with the current state", () => {
    const draw = vi.fn();
    render(<Harness state="a" draw={draw} />);

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(draw).toHaveBeenCalledWith(asCanvasContext(context), 300, 200, "a");
  });

  it("repaints on state change without re-creating the observer", () => {
    const draw = vi.fn();
    const { rerender, getByTestId } = render(<Harness state="a" draw={draw} />);
    const canvas = getByTestId("canvas") as HTMLCanvasElement;
    const widthBefore = canvas.width;

    rerender(<Harness state="b" draw={draw} />);

    expect(draw).toHaveBeenLastCalledWith(
      asCanvasContext(context),
      300,
      200,
      "b",
    );
    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(FakeResizeObserver.instances[0].disconnect).not.toHaveBeenCalled();
    expect(canvas.width).toBe(widthBefore);
  });

  it("resizes and repaints when the container size changes", () => {
    const draw = vi.fn();
    const { getByTestId } = render(<Harness state="a" draw={draw} />);
    const canvas = getByTestId("canvas") as HTMLCanvasElement;

    mockContainerSize(500, 250);
    FakeResizeObserver.instances[0].trigger();

    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(500);
    expect(draw).toHaveBeenLastCalledWith(
      asCanvasContext(context),
      500,
      250,
      "a",
    );
  });

  it("observes the container and disconnects on unmount", () => {
    const { getByTestId, unmount } = render(<Harness state="a" draw={vi.fn()} />);
    const observer = FakeResizeObserver.instances[0];

    expect(observer.observe).toHaveBeenCalledWith(getByTestId("container"));

    unmount();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it("never sizes the canvas below 1x1", () => {
    mockContainerSize(0, 0);
    const { getByTestId } = render(<Harness state="a" draw={vi.fn()} />);
    const canvas = getByTestId("canvas") as HTMLCanvasElement;

    expect(canvas.style.width).toBe("1px");
    expect(canvas.style.height).toBe("1px");
  });
});
