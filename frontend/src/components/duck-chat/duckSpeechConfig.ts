/**
 * Centralized Web Speech API settings for the Speaking Duck.
 * Tunable without touching playback lifecycle code.
 *
 * Voices differ by browser/OS; pitch and rate are the portable duck-like cues.
 */

export const DUCK_SPEECH_CONFIG = {
  /** Slightly higher than default (1) for a playful, cartoonish duck. */
  pitch: 1.45,
  /** Slightly faster than default (1) for energetic delivery. */
  rate: 1.2,
  lang: "en-US",
} as const;

/** Soft preference when the browser exposes named voices; optional fallback is fine. */
const PREFERRED_VOICE_NAME = /female|samantha|karen|zira|google us english/i;

/**
 * Pick a preferred English-ish voice when available; otherwise return undefined
 * so the utterance uses the browser default.
 */
export function pickDuckVoice(
  voices: ReadonlyArray<SpeechSynthesisVoice>,
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) {
    return undefined;
  }

  const preferred = voices.find(
    (voice) =>
      PREFERRED_VOICE_NAME.test(voice.name) &&
      voice.lang.toLowerCase().startsWith("en"),
  );
  if (preferred) {
    return preferred;
  }

  const english = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith("en"),
  );
  return english ?? voices[0];
}
