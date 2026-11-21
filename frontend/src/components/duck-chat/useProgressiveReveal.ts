import { useEffect, useState } from "react";

const DEFAULT_CHARS_PER_TICK = 3;
const DEFAULT_TICK_MS = 30;

export interface ProgressiveRevealOptions {
  /** Full canonical text to reveal visually. */
  text: string;
  /** When false, show nothing (e.g. chat closed). */
  active: boolean;
  /** Skip animation and show the full string immediately. */
  reducedMotion: boolean;
  charsPerTick?: number;
  tickMs?: number;
}

export interface ProgressiveRevealResult {
  /** Substring currently shown in the bubble. */
  displayed: string;
  /** True until the full text has been shown. */
  isRevealing: boolean;
}

/**
 * Presentation-only progressive reveal. Does not own conversation truth.
 */
export function useProgressiveReveal({
  text,
  active,
  reducedMotion,
  charsPerTick = DEFAULT_CHARS_PER_TICK,
  tickMs = DEFAULT_TICK_MS,
}: ProgressiveRevealOptions): ProgressiveRevealResult {
  const [visibleLength, setVisibleLength] = useState(() =>
    reducedMotion || !active ? text.length : 0,
  );

  useEffect(() => {
    if (!active || !text) {
      setVisibleLength(0);
      return;
    }
    if (reducedMotion) {
      setVisibleLength(text.length);
      return;
    }

    setVisibleLength(0);
    const id = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= text.length) {
          window.clearInterval(id);
          return text.length;
        }
        return Math.min(text.length, current + charsPerTick);
      });
    }, tickMs);

    return () => {
      window.clearInterval(id);
    };
  }, [text, active, reducedMotion, charsPerTick, tickMs]);

  const displayed = text.slice(0, Math.min(visibleLength, text.length));
  const isRevealing = active && !reducedMotion && visibleLength < text.length;

  return { displayed, isRevealing };
}
