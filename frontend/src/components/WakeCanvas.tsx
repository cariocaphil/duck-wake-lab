import { useEffect, useRef } from "react";
import type { DuckParameters } from "../types";

interface WakeCanvasProps {
  parameters: DuckParameters;
}

function drawPlaceholder(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  parameters: DuckParameters,
): void {
  const duckScale = 0.35 + parameters.bodyLength * 0.45;

  context.clearRect(0, 0, width, height);

  // Water background
  context.fillStyle = "#4a90a4";
  context.fillRect(0, 0, width, height);

  // Subtle surface ripples (decorative only)
  context.strokeStyle = "rgba(255, 255, 255, 0.15)";
  context.lineWidth = 1;
  for (let y = height * 0.15; y < height; y += 28) {
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= width; x += 20) {
      context.lineTo(x, y + Math.sin(x * 0.05 + y) * 3);
    }
    context.stroke();
  }

  const centerX = width * 0.5;
  const centerY = height * 0.45;
  const bodyWidth = 48 * duckScale;
  const bodyHeight = 28 * duckScale;

  // Duck body
  context.fillStyle = "#2c3e50";
  context.beginPath();
  context.ellipse(centerX, centerY, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
  context.fill();

  // Duck head
  context.beginPath();
  context.arc(
    centerX + bodyWidth * 0.75,
    centerY - bodyHeight * 0.35,
    14 * duckScale,
    0,
    Math.PI * 2,
  );
  context.fill();

  // Beak
  context.fillStyle = "#e67e22";
  context.beginPath();
  context.moveTo(centerX + bodyWidth * 0.95, centerY - bodyHeight * 0.35);
  context.lineTo(centerX + bodyWidth * 1.35, centerY - bodyHeight * 0.2);
  context.lineTo(centerX + bodyWidth * 0.95, centerY - bodyHeight * 0.1);
  context.closePath();
  context.fill();

  // Placeholder message
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.font = "600 16px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Wake visualization coming soon", centerX, height * 0.82);

  context.font = "13px system-ui, sans-serif";
  context.fillStyle = "rgba(255, 255, 255, 0.75)";
  context.fillText(
    `${parameters.species} · ${parameters.speed.toFixed(2)} m/s · Kelvin model`,
    centerX,
    height * 0.9,
  );
}

export function WakeCanvas({ parameters }: WakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    function resizeAndDraw(): void {
      if (!canvas || !container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.max(1, Math.floor(rect.width));
      const displayHeight = Math.max(1, Math.floor(rect.height));

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPlaceholder(context, displayWidth, displayHeight, parameters);
    }

    resizeAndDraw();

    const observer = new ResizeObserver(resizeAndDraw);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [parameters]);

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
