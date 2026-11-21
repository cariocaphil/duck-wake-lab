interface DuckSpeechControlsProps {
  /** Latest assistant answer text; Speak uses this. */
  latestText: string | null;
  canReplay: boolean;
  /** True while an utterance is pending start or actively speaking. */
  isBusy: boolean;
  onSpeak: () => void;
  onStop: () => void;
  onReplay: () => void;
}

/**
 * Explicit Speak / Stop / Replay controls for duck TTS.
 * Hidden by the parent when speech synthesis is unsupported.
 */
export function DuckSpeechControls({
  latestText,
  canReplay,
  isBusy,
  onSpeak,
  onStop,
  onReplay,
}: DuckSpeechControlsProps) {
  const hasLatest = Boolean(latestText?.trim());

  return (
    <div
      className="duck-speech-controls"
      data-testid="duck-speech-controls"
      role="group"
      aria-label="Duck speech playback"
    >
      <button
        type="button"
        className="duck-speech-controls__button"
        aria-label="Speak latest duck response"
        data-testid="duck-speech-speak"
        disabled={!hasLatest || isBusy}
        onClick={onSpeak}
      >
        Speak
      </button>
      <button
        type="button"
        className="duck-speech-controls__button"
        aria-label="Stop duck speech"
        data-testid="duck-speech-stop"
        disabled={!isBusy}
        onClick={onStop}
      >
        Stop
      </button>
      <button
        type="button"
        className="duck-speech-controls__button"
        aria-label="Replay last spoken duck response"
        data-testid="duck-speech-replay"
        disabled={!canReplay || isBusy}
        onClick={onReplay}
      >
        Replay
      </button>
    </div>
  );
}
