import type { WakeResponse } from "../api/types";
import { computeViewBox, polylinePoints } from "../svg/wakeSvg";

interface WakeVisualizationProps {
  wake: WakeResponse | null;
  loading: boolean;
  error: string | null;
}

export function WakeVisualization({
  wake,
  loading,
  error,
}: WakeVisualizationProps) {
  const status =
    error !== null
      ? error
      : loading && wake === null
        ? "Loading wake geometry…"
        : loading
          ? "Updating wake geometry…"
          : wake === null
            ? "No wake data yet."
            : null;

  return (
    <section className="visualization" aria-label="Wake visualization">
      <h2>Wake</h2>

      <div className="svg-container">
        {wake !== null ? (
          <svg
            role="img"
            aria-label="Kelvin wake envelope"
            viewBox={computeViewBox(wake)}
            preserveAspectRatio="xMidYMid meet"
            data-testid="wake-svg"
          >
            <defs>
              <marker
                id="swim-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L6,3 L0,6 Z" className="swim-arrow-head" />
              </marker>
            </defs>
            <polyline
              data-testid="wake-port"
              className="wake-arm wake-arm-port"
              fill="none"
              points={polylinePoints(wake.port_x_m, wake.port_y_m)}
            />
            <polyline
              data-testid="wake-starboard"
              className="wake-arm wake-arm-starboard"
              fill="none"
              points={polylinePoints(wake.starboard_x_m, wake.starboard_y_m)}
            />
            <circle
              data-testid="wake-duck"
              className="wake-duck"
              cx={0}
              cy={0}
              r={Math.max(wake.wake_length_m * 0.02, 0.05)}
            />
            <line
              data-testid="swim-direction"
              className="swim-direction"
              x1={0}
              y1={0}
              x2={wake.wake_length_m * 0.1}
              y2={0}
              markerEnd="url(#swim-arrow)"
            />
          </svg>
        ) : (
          <div className="svg-placeholder" data-testid="wake-placeholder">
            {status ?? "Waiting for wake geometry…"}
          </div>
        )}
      </div>

      {status !== null && (
        <p className="wake-status" role="status" data-testid="wake-status">
          {status}
        </p>
      )}
    </section>
  );
}
