export type DuckAvatarState = "idle" | "thinking" | "speaking";

interface DuckAvatarProps {
  state: DuckAvatarState;
  /** Decorative size in CSS pixels (SVG viewBox is fixed). */
  size?: number;
  className?: string;
}

/**
 * Side-facing speaking-duck character. Visual state is independent of API I/O;
 * `speaking` is driven by TTS playback via `useDuckSpeech`.
 */
export function DuckAvatar({
  state,
  size = 72,
  className = "",
}: DuckAvatarProps) {
  return (
    <svg
      className={`duck-avatar duck-avatar--${state} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Duck is ${state}`}
      data-testid="duck-avatar"
      data-state={state}
    >
      <g className="duck-avatar__body-group">
        <ellipse
          className="duck-avatar__body"
          cx="30"
          cy="38"
          rx="18"
          ry="14"
        />
        <ellipse
          className="duck-avatar__wing"
          cx="24"
          cy="40"
          rx="8"
          ry="5"
          transform="rotate(-20 24 40)"
        />
      </g>
      <g className="duck-avatar__head-group">
        <circle className="duck-avatar__head" cx="44" cy="24" r="11" />
        <circle className="duck-avatar__eye" cx="47" cy="22" r="2.2" />
        <circle className="duck-avatar__eye-shine" cx="47.6" cy="21.4" r="0.7" />
        <g className="duck-avatar__beak">
          <path
            className="duck-avatar__beak-upper"
            d="M52 24 L62 22 L52 26 Z"
          />
          <path
            className="duck-avatar__beak-lower"
            d="M52 26 L60 28 L52 27.5 Z"
          />
        </g>
      </g>
      {state === "thinking" ? (
        <g className="duck-avatar__think" aria-hidden="true">
          <circle cx="14" cy="14" r="2.5" />
          <circle cx="10" cy="8" r="1.8" />
          <circle cx="8" cy="3" r="1.2" />
        </g>
      ) : null}
    </svg>
  );
}
