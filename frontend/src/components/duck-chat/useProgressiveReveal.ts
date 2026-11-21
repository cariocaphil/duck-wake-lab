import { useEffect, useRef, useState } from "react";

const DEFAULT_CHARS_PER_TICK = 3;
const DEFAULT_TICK_MS = 30;

export interface ProgressiveRevealOptions {
  /** Identity of the answer being presented; drives restart independently of text. */
  messageId: string | null;
  /** Full canonical text to reveal visually. */
  text: string;
  /** When false, presentation is inactive (e.g. loading/error). */
  active: boolean;
  /** Skip animation and show the full string immediately. */
  reducedMotion: boolean;
  /** Message was already revealed; show full text and do not animate again. */
  alreadyRevealed: boolean;
  /** Fired once when this messageId is fully shown (animated or skipped). */
  onRevealed?: (messageId: string) => void;
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
 * Keys animation by messageId so identical consecutive answers still animate,
 * and alreadyRevealed prevents reopen replay.
 */
export function useProgressiveReveal({
  messageId,
  text,
  active,
  reducedMotion,
  alreadyRevealed,
  onRevealed,
  charsPerTick = DEFAULT_CHARS_PER_TICK,
  tickMs = DEFAULT_TICK_MS,
}: ProgressiveRevealOptions): ProgressiveRevealResult {
  const [visibleLength, setVisibleLength] = useState(() =>
    !active || !messageId || !text || alreadyRevealed || reducedMotion
      ? text.length
      : 0,
  );
  const notifiedIdRef = useRef<string | null>(null);
  const trackedMessageIdRef = useRef<string | null>(messageId);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  useEffect(() => {
    if (trackedMessageIdRef.current !== messageId) {
      notifiedIdRef.current = null;
      trackedMessageIdRef.current = messageId;
    }

    if (!active || !messageId || !text) {
      setVisibleLength(0);
      return;
    }

    const notifyOnce = () => {
      if (notifiedIdRef.current === messageId) {
        return;
      }
      notifiedIdRef.current = messageId;
      onRevealedRef.current?.(messageId);
    };

    if (alreadyRevealed || reducedMotion) {
      setVisibleLength(text.length);
      notifyOnce();
      return;
    }

    setVisibleLength(0);
    const id = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= text.length) {
          window.clearInterval(id);
          return text.length;
        }
        const next = Math.min(text.length, current + charsPerTick);
        if (next >= text.length) {
          window.clearInterval(id);
          queueMicrotask(notifyOnce);
        }
        return next;
      });
    }, tickMs);

    return () => {
      window.clearInterval(id);
    };
  }, [
    messageId,
    text,
    active,
    reducedMotion,
    alreadyRevealed,
    charsPerTick,
    tickMs,
  ]);

  const displayed =
    active && messageId && text
      ? text.slice(0, Math.min(visibleLength, text.length))
      : "";
  const isRevealing =
    Boolean(active && messageId && text) &&
    !reducedMotion &&
    !alreadyRevealed &&
    visibleLength < text.length;

  return { displayed, isRevealing };
}
