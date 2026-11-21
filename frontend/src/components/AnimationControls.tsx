import {
  ANIMATION_SPEEDS,
  isAnimationSpeed,
  type AnimationSpeed,
} from "../animation/simulation";

interface AnimationControlsProps {
  playing: boolean;
  speed: AnimationSpeed;
  /** True when the OS asks for reduced motion (playback starts paused). */
  reducedMotion: boolean;
  /** Physical swimming speed of the current wave field, for the hint. */
  swimmingSpeedMS: number | null;
  onTogglePlaying: () => void;
  onSpeedChange: (speed: AnimationSpeed) => void;
  onReset: () => void;
}

function formatMultiplier(speed: AnimationSpeed): string {
  return `${speed}×`;
}

/**
 * Playback controls. They only change how the simulation is played back
 * (time, duck position and wave phase); the physical swimming speed (m/s) is
 * a separate parameter set in the main controls.
 */
export function AnimationControls({
  playing,
  speed,
  reducedMotion,
  swimmingSpeedMS,
  onTogglePlaying,
  onSpeedChange,
  onReset,
}: AnimationControlsProps) {
  return (
    <fieldset className="animation-controls" data-testid="animation-controls">
      <legend>Animation</legend>
      <div className="animation-buttons">
        <button
          type="button"
          className="animation-button"
          aria-label={playing ? "Pause animation" : "Play animation"}
          onClick={onTogglePlaying}
          data-testid="animation-toggle"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="animation-button"
          aria-label="Reset animation"
          onClick={onReset}
          data-testid="animation-reset"
        >
          Reset
        </button>
      </div>

      <fieldset className="animation-speed" data-testid="animation-speed">
        <legend>Animation speed (×)</legend>
        {ANIMATION_SPEEDS.map((option) => (
          <label key={option} className="animation-speed-option">
            <input
              type="radio"
              name="animation-speed"
              value={option}
              checked={speed === option}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (isAnimationSpeed(next)) {
                  onSpeedChange(next);
                }
              }}
            />
            {formatMultiplier(option)}
          </label>
        ))}
      </fieldset>

      <p className="control-hint" data-testid="animation-hint">
        Animation speed only changes playback. Swimming speed
        {swimmingSpeedMS !== null && ` (${swimmingSpeedMS.toFixed(2)} m/s)`} is
        a physical parameter set in Controls.
      </p>
      {reducedMotion && (
        <p className="control-hint" data-testid="animation-reduced-motion">
          Reduced motion is requested in your system settings, so the animation
          starts paused. Press Play to start it.
        </p>
      )}
    </fieldset>
  );
}
