import { PHYSICS_LEVEL_LABELS, type DuckParameters } from "../types";

function drawWater(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = "#4a90a4";
  context.fillRect(0, 0, width, height);
}

/** Subtle surface ripples (decorative only). */
function drawRipples(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
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
}

function drawDuck(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  bodyLength: number,
): void {
  const duckScale = 0.35 + bodyLength * 0.45;
  const bodyWidth = 48 * duckScale;
  const bodyHeight = 28 * duckScale;

  // Body
  context.fillStyle = "#2c3e50";
  context.beginPath();
  context.ellipse(centerX, centerY, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
  context.fill();

  // Head
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
}

function drawCaption(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  parameters: DuckParameters,
): void {
  const centerX = width * 0.5;

  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.font = "600 16px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Wake visualization coming soon", centerX, height * 0.82);

  const model = PHYSICS_LEVEL_LABELS[parameters.physicsLevel];
  context.font = "13px system-ui, sans-serif";
  context.fillStyle = "rgba(255, 255, 255, 0.75)";
  context.fillText(
    `${parameters.species} · ${parameters.speed.toFixed(2)} m/s · ${model} model`,
    centerX,
    height * 0.9,
  );
}

/**
 * Draws the placeholder scene: water, ripples, a duck scaled by body length,
 * and a caption describing the selected parameters.
 * Expects a context already scaled to CSS pixels.
 */
export function drawPlaceholder(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  parameters: DuckParameters,
): void {
  context.clearRect(0, 0, width, height);

  drawWater(context, width, height);
  drawRipples(context, width, height);
  drawDuck(context, width * 0.5, height * 0.45, parameters.bodyLength);
  drawCaption(context, width, height, parameters);
}
