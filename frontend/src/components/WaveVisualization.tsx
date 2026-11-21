import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { footTransform } from "../animation/duckPose";
import {
  ratesFromWaveField,
  waterMarkOffsetM,
  type SimulationState,
} from "../animation/simulation";
import type { WaveFieldResponse } from "../api/wakeClient";
import { useWakeAnimation } from "../hooks/useWakeAnimation";
import { polylinePoints } from "../svg/wakeSvg";
import { AnimationControls } from "./AnimationControls";
import { DuckSprite } from "./DuckSprite";
import {
  CREST_RGB,
  DEFAULT_WAVE_FAMILY,
  NEUTRAL_RGB,
  TROUGH_RGB,
  WAVE_FAMILY_IDS,
  WAVE_FAMILY_LABELS,
  fieldScale,
  fillRgba,
  isWaveFamily,
  kelvinBoundaries,
  rgbCss,
  selectField,
  waterMarksPath,
  waveViewBox,
  type WaveFamily,
} from "../waves/waveField";

interface WaveVisualizationProps {
  waveField: WaveFieldResponse | null;
  loading: boolean;
  error: string | null;
}

const LEGEND_GRADIENT = `linear-gradient(to right, ${rgbCss(TROUGH_RGB)}, ${rgbCss(NEUTRAL_RGB)}, ${rgbCss(CREST_RGB)})`;

function formatScale(scale: number): string {
  return scale.toFixed(2);
}

/** Spacing of the world-fixed reference dots, in duck lengths. */
const WATER_MARK_SPACING_LENGTHS = 2;

/**
 * Top-down, animated view of the illustrative wave-interference field.
 *
 * Rendering uses a following camera. The duck and its wake are drawn at fixed
 * camera-relative coordinates (duck at the origin, wake at x <= 0, in meters)
 * so the wake can never detach from its source; the world-fixed reference dots
 * scroll by minus the distance swum. Crests are stationary in that frame
 * (steady wake): only the marks and paddling feet are updated per frame.
 * React does not re-render at 60 FPS and no request is ever made per frame.
 */
export function WaveVisualization({
  waveField,
  loading,
  error,
}: WaveVisualizationProps) {
  // Family and boundary toggles are local UI state: they never trigger a request.
  const [family, setFamily] = useState<WaveFamily>(DEFAULT_WAVE_FAMILY);
  const [showKelvin, setShowKelvin] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const marksRef = useRef<SVGPathElement | null>(null);
  const portFootRef = useRef<SVGEllipseElement | null>(null);
  const starboardFootRef = useRef<SVGEllipseElement | null>(null);

  // The scale is derived from the response only, never from the family, so
  // it stays fixed while switching between Transverse, Divergent and Both.
  const scale = useMemo(
    () => (waveField === null ? 1 : fieldScale(waveField)),
    [waveField],
  );
  const field = useMemo(
    () => (waveField === null ? null : selectField(waveField, family)),
    [waveField, family],
  );
  const rates = useMemo(
    () => (waveField === null ? null : ratesFromWaveField(waveField)),
    [waveField],
  );
  const markSpacingM =
    waveField === null ? 0 : WATER_MARK_SPACING_LENGTHS * waveField.duck_length_m;

  // Paint the static wake field when physics or family changes (not every frame).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || field === null) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const nx = field[0]?.length ?? 0;
    const ny = field.length;
    const image = ctx.createImageData(nx, ny);
    fillRgba(image.data, field, scale);
    ctx.putImageData(image, 0, 0);
  }, [field, scale]);

  // Per-frame: scroll world marks and paddle feet only.
  const drawMotion = useCallback(
    (state: SimulationState) => {
      marksRef.current?.setAttribute(
        "transform",
        `translate(${-waterMarkOffsetM(state.distanceM, markSpacingM)} 0)`,
      );
      portFootRef.current?.setAttribute(
        "transform",
        footTransform("port", state.strokePhase),
      );
      starboardFootRef.current?.setAttribute(
        "transform",
        footTransform("starboard", state.strokePhase),
      );
    },
    [markSpacingM],
  );

  const animation = useWakeAnimation({ rates, onFrame: drawMotion });
  const { stateRef } = animation;

  // Sync marks/feet when spacing or response changes, including while paused.
  useEffect(() => {
    drawMotion(stateRef.current);
  }, [drawMotion, stateRef]);

  const isError = error !== null;
  const status = isError
    ? error
    : loading && waveField === null
      ? "Loading wave pattern…"
      : loading
        ? "Updating wave pattern…"
        : waveField === null
          ? "No wave data yet."
          : null;
  const statusMessage =
    status !== null ? (
      <p
        className={`wake-status ${isError ? "wake-status--error" : "wake-status--info"}`}
        role={isError ? "alert" : "status"}
        data-testid="wave-status"
      >
        {status}
      </p>
    ) : null;

  const kelvin = waveField !== null ? kelvinBoundaries(waveField) : null;

  return (
    <section
      className="visualization wave-visualization"
      aria-label="Wave pattern visualization"
    >
      <h2>Wave interference</h2>
      <p className="wave-model-label" data-testid="wave-model-label">
        Illustrative interference model, not a physically exact duck wake.
        Crests are steady in the duck&apos;s frame; motion is the duck and
        the scrolling water.
      </p>

      <AnimationControls
        playing={animation.playing}
        speed={animation.speed}
        reducedMotion={animation.reducedMotion}
        swimmingSpeedMS={waveField?.swimming_speed_m_s ?? null}
        onTogglePlaying={animation.togglePlaying}
        onSpeedChange={animation.setSpeed}
        onReset={animation.reset}
      />

      <div className="wave-options">
        <fieldset className="wave-family" data-testid="wave-family">
          <legend>Wave family</legend>
          {WAVE_FAMILY_IDS.map((id) => (
            <label key={id} className="wave-family-option">
              <input
                type="radio"
                name="wave-family"
                value={id}
                checked={family === id}
                onChange={(event) => {
                  if (isWaveFamily(event.target.value)) {
                    setFamily(event.target.value);
                  }
                }}
              />
              {WAVE_FAMILY_LABELS[id]}
            </label>
          ))}
        </fieldset>
        <label className="wave-kelvin-toggle">
          <input
            type="checkbox"
            checked={showKelvin}
            onChange={(event) => {
              setShowKelvin(event.target.checked);
            }}
          />
          Show Kelvin boundaries
        </label>
      </div>

      <div className="svg-container wave-container">
        {waveField !== null && kelvin !== null ? (
          <svg
            role="img"
            aria-label={`Illustrative ${WAVE_FAMILY_LABELS[family].toLowerCase()} wave pattern behind the swimming duck`}
            viewBox={waveViewBox(waveField)}
            preserveAspectRatio="xMidYMid meet"
            data-testid="wave-svg"
            data-family={family}
            data-playing={animation.playing}
          >
            <foreignObject
              x={Math.min(...waveField.x_m)}
              y={-Math.max(...waveField.y_m)}
              width={Math.max(...waveField.x_m) - Math.min(...waveField.x_m)}
              height={2 * Math.max(...waveField.y_m)}
            >
              <canvas
                ref={canvasRef}
                className="wave-canvas"
                width={waveField.nx}
                height={waveField.ny}
                data-testid="wave-canvas"
                data-family={family}
                data-scale={scale}
              />
            </foreignObject>
            <path
              ref={marksRef}
              data-testid="wave-water-marks"
              className="wave-water-marks"
              strokeWidth={0.05 * waveField.duck_length_m}
              d={waterMarksPath(
                Math.min(...waveField.x_m),
                Math.max(...waveField.x_m),
                Math.max(...waveField.y_m),
                markSpacingM,
              )}
            />
            {showKelvin && (
              <>
                <polyline
                  data-testid="wave-kelvin-port"
                  className="wave-kelvin-arm"
                  fill="none"
                  points={polylinePoints(kelvin.port)}
                />
                <polyline
                  data-testid="wave-kelvin-starboard"
                  className="wave-kelvin-arm"
                  fill="none"
                  points={polylinePoints(kelvin.starboard)}
                />
              </>
            )}
            <DuckSprite
              lengthM={waveField.duck_length_m}
              portFootRef={portFootRef}
              starboardFootRef={starboardFootRef}
            />
          </svg>
        ) : (
          <div className="svg-placeholder" data-testid="wave-placeholder">
            {statusMessage ?? "Waiting for wave field…"}
          </div>
        )}
      </div>

      {waveField !== null && (
        <div className="wave-legend" data-testid="wave-legend">
          <div
            className="wave-legend-bar"
            style={{ background: LEGEND_GRADIENT }}
            aria-hidden="true"
          />
          <div className="wave-legend-labels">
            <span>−{formatScale(scale)} trough (−)</span>
            <span>0</span>
            <span>crest (+) +{formatScale(scale)}</span>
          </div>
          <p className="wave-legend-note">
            Same color scale for all three views (arbitrary units), so weaker
            waves look weaker than the combined field.
          </p>
        </div>
      )}

      {waveField !== null && statusMessage}

      <details className="wave-explanation" data-testid="wave-explanation">
        <summary>How to read this view</summary>
        <p>
          <strong>Illustrative interference model.</strong> The field is a
          simple mathematical picture built to show the ideas below. It is not
          a fluid simulation and does not reproduce a physically exact duck
          wake. Colors show surface displacement in arbitrary units.
        </p>
        <dl>
          <dt>Transverse waves</dt>
          <dd>
            Crests extend approximately across the duck&apos;s direction of
            travel, curving back toward the duck at the edges.
          </dd>
          <dt>Divergent waves</dt>
          <dd>
            Crests spread outward diagonally and contribute to the familiar
            V-shaped wake.
          </dd>
          <dt>Constructive interference</dt>
          <dd>
            Where the two contributions have the same sign, their
            displacements reinforce one another, so the combined crest or
            trough is stronger than either alone.
          </dd>
          <dt>Destructive interference</dt>
          <dd>
            Where the contributions have opposite signs, they partially or
            completely cancel, so the combined field is weaker.
          </dd>
          <dt>Animation</dt>
          <dd>
            The duck swims at the selected swimming speed (m/s) while the camera
            follows it, so the wake always stays attached behind the duck and
            the dotted water scrolls past. Crests are stationary relative to
            the duck (a steady wake in the duck&apos;s frame), matching the
            expected relationship for an approximately steady Kelvin wake. A
            traveling-phase term is not used: it made crests drift the wrong
            way relative to a real wake. The animation speed control only
            changes playback, never the physical swimming speed.
          </dd>
        </dl>
        <p>
          The Kelvin angle (about 19.47°) describes the classical wake
          envelope, shown as dashed boundary lines for reference. It is not
          the direction of the individual wave crests.
        </p>
      </details>
    </section>
  );
}
