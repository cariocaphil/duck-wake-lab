import type { WakeResponse } from "../api/wakeClient";
import { computeViewBox, polylinePoints, wedgePoints } from "../svg/wakeSvg";

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
  const isError = error !== null;
  // Render from the response's own mode so a stale control value can never
  // mismatch the geometry on screen.
  const isAdvanced = wake?.physics_mode === "advanced";
  const status = isError
    ? error
    : loading && wake === null
      ? "Loading wake geometry…"
      : loading
        ? "Updating wake geometry…"
        : wake === null
          ? "No wake data yet."
          : null;

  const statusClassName = `wake-status ${isError ? "wake-status--error" : "wake-status--info"}`;
  const statusRole = isError ? "alert" : "status";

  const statusMessage =
    status !== null ? (
      <p
        className={statusClassName}
        role={statusRole}
        data-testid="wake-status"
      >
        {status}
      </p>
    ) : null;

  return (
    <section className="visualization" aria-label="Wake visualization">
      <h2>Wake</h2>

      <div className="svg-container">
        {wake !== null ? (
          <svg
            role="img"
            aria-label={
              isAdvanced
                ? "Kelvin envelope and apparent wake"
                : "Kelvin wake envelope"
            }
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
            {isAdvanced && (
              <polygon
                data-testid="wake-apparent-region"
                className="wake-apparent-region"
                points={wedgePoints(
                  wake.apparent_port_boundary,
                  wake.apparent_starboard_boundary,
                )}
              />
            )}
            <polyline
              data-testid="wake-port"
              className={`wake-arm wake-arm-port${isAdvanced ? " wake-envelope-arm" : ""}`}
              fill="none"
              points={polylinePoints(wake.port_boundary)}
            />
            <polyline
              data-testid="wake-starboard"
              className={`wake-arm wake-arm-starboard${isAdvanced ? " wake-envelope-arm" : ""}`}
              fill="none"
              points={polylinePoints(wake.starboard_boundary)}
            />
            {isAdvanced && (
              <>
                <polyline
                  data-testid="wake-apparent-port"
                  className="wake-apparent-arm"
                  fill="none"
                  points={polylinePoints(wake.apparent_port_boundary)}
                />
                <polyline
                  data-testid="wake-apparent-starboard"
                  className="wake-apparent-arm"
                  fill="none"
                  points={polylinePoints(wake.apparent_starboard_boundary)}
                />
              </>
            )}
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
            {statusMessage ?? "Waiting for wake geometry…"}
          </div>
        )}
      </div>

      {wake !== null && isAdvanced && (
        <ul className="wake-legend" data-testid="wake-legend" aria-label="Legend">
          <li>
            <span
              className="wake-legend-swatch wake-legend-swatch--envelope"
              aria-hidden="true"
            />
            Kelvin envelope (fixed)
          </li>
          <li>
            <span
              className="wake-legend-swatch wake-legend-swatch--apparent"
              aria-hidden="true"
            />
            Apparent wake (dominant)
          </li>
        </ul>
      )}

      {wake !== null && statusMessage}
    </section>
  );
}
