import { useCallback, useEffect, useRef } from "react";

export type DrawFunction<T> = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: T,
) => void;

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Sizes the canvas backing store to its container (accounting for
 * devicePixelRatio) and returns the resulting CSS-pixel size.
 */
function fitCanvasToContainer(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
): CanvasSize {
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  return { width, height, dpr };
}

/**
 * Keeps a canvas sized to its container and repainted with `draw`.
 *
 * - Container resizes resize the canvas and repaint.
 * - `state` changes only repaint; the canvas size and observer are untouched.
 *
 * Returns refs to attach to the container element and the canvas element.
 */
export function useResponsiveCanvas<T>(state: T, draw: DrawFunction<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Latest state and draw function, readable from the long-lived
  // ResizeObserver callback without re-creating the observer.
  const stateRef = useRef(state);
  const drawRef = useRef(draw);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });

  // Stable (only reads refs), so effects depending on it never re-run.
  const paint = useCallback((): void => {
    const canvas = canvasRef.current;
    const { width, height, dpr } = sizeRef.current;
    if (!canvas || width === 0 || height === 0) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRef.current(context, width, height, stateRef.current);
  }, []);

  // Resize only when the container size changes; the observer lives until unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    function resizeAndPaint(): void {
      if (!canvas || !container) {
        return;
      }
      sizeRef.current = fitCanvasToContainer(canvas, container);
      paint();
    }

    resizeAndPaint();

    const observer = new ResizeObserver(resizeAndPaint);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [paint]);

  // State changes only repaint.
  useEffect(() => {
    stateRef.current = state;
    drawRef.current = draw;
    paint();
  }, [state, draw, paint]);

  return { canvasRef, containerRef };
}
