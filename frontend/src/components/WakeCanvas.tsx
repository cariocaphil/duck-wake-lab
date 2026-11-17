import { drawPlaceholder } from "../canvas/drawPlaceholder";
import { useResponsiveCanvas } from "../hooks/useResponsiveCanvas";
import type { DuckParameters } from "../types";

interface WakeCanvasProps {
  parameters: DuckParameters;
}

export function WakeCanvas({ parameters }: WakeCanvasProps) {
  const { canvasRef, containerRef } = useResponsiveCanvas(
    parameters,
    drawPlaceholder,
  );

  return (
    <section className="visualization" aria-label="Wake visualization">
      <h2>Visualization</h2>
      <div ref={containerRef} className="canvas-container">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Wake visualization placeholder"
        />
      </div>
    </section>
  );
}
