import { useCallback, useEffect, useRef, useState } from "react";
import {
  DUCK_SPEECH_CONFIG,
  pickDuckVoice,
} from "../components/duck-chat/duckSpeechConfig";

function speechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.speechSynthesis?.speak === "function"
  );
}

export interface UseDuckSpeechResult {
  supported: boolean;
  /** True only after the active utterance's `onstart`. */
  isSpeaking: boolean;
  /** True after speak/replay is scheduled but before `onstart` (or while speaking). */
  isBusy: boolean;
  /** True once an utterance has actually started at least once. */
  canReplay: boolean;
  /** Speak caller-supplied text (UI should pass the latest assistant answer). */
  speak: (text: string) => void;
  stop: () => void;
  /** Re-speak the most recently spoken text only (not necessarily the latest answer). */
  replay: () => void;
}

/**
 * Browser Web Speech API playback for the Speaking Duck.
 * Keeps speech lifecycle separate from chat I/O and avatar visuals.
 */
export function useDuckSpeech(): UseDuckSpeechResult {
  const supported = speechSynthesisSupported();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [canReplay, setCanReplay] = useState(false);

  const utteranceIdRef = useRef(0);
  const activeTextRef = useRef<string | null>(null);
  const lastSpokenTextRef = useRef<string | null>(null);
  const isSpeakingRef = useRef(false);
  const isPendingRef = useRef(false);

  const setSpeakingState = useCallback((speaking: boolean) => {
    isSpeakingRef.current = speaking;
    setIsSpeaking(speaking);
  }, []);

  const setPendingState = useCallback((pending: boolean) => {
    isPendingRef.current = pending;
    setIsPending(pending);
  }, []);

  const invalidateActive = useCallback(() => {
    utteranceIdRef.current += 1;
    activeTextRef.current = null;
    setSpeakingState(false);
    setPendingState(false);
  }, [setPendingState, setSpeakingState]);

  const cancelSynthesis = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const stop = useCallback(() => {
    if (!supported) {
      return;
    }
    invalidateActive();
    cancelSynthesis();
  }, [cancelSynthesis, invalidateActive, supported]);

  const speak = useCallback(
    (rawText: string) => {
      if (!supported || !window.speechSynthesis) {
        return;
      }

      const text = rawText.trim();
      if (!text) {
        return;
      }

      const busy = isPendingRef.current || isSpeakingRef.current;
      if (busy && activeTextRef.current === text) {
        // Duplicate Speak while the same utterance is pending or playing.
        return;
      }

      invalidateActive();
      cancelSynthesis();

      const id = utteranceIdRef.current;
      activeTextRef.current = text;
      setPendingState(true);
      setSpeakingState(false);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = DUCK_SPEECH_CONFIG.pitch;
      utterance.rate = DUCK_SPEECH_CONFIG.rate;
      utterance.lang = DUCK_SPEECH_CONFIG.lang;

      const voice = pickDuckVoice(window.speechSynthesis.getVoices());
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (id !== utteranceIdRef.current) {
          return;
        }
        lastSpokenTextRef.current = text;
        setCanReplay(true);
        setPendingState(false);
        setSpeakingState(true);
      };

      utterance.onend = () => {
        if (id !== utteranceIdRef.current) {
          return;
        }
        activeTextRef.current = null;
        setPendingState(false);
        setSpeakingState(false);
      };

      utterance.onerror = () => {
        if (id !== utteranceIdRef.current) {
          return;
        }
        activeTextRef.current = null;
        setPendingState(false);
        setSpeakingState(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      cancelSynthesis,
      invalidateActive,
      setPendingState,
      setSpeakingState,
      supported,
    ],
  );

  const replay = useCallback(() => {
    const last = lastSpokenTextRef.current;
    if (!last) {
      return;
    }
    speak(last);
  }, [speak]);

  useEffect(() => {
    if (!supported) {
      return;
    }
    // Some browsers populate voices asynchronously; warm the list once.
    window.speechSynthesis?.getVoices();
    return () => {
      invalidateActive();
      cancelSynthesis();
    };
  }, [cancelSynthesis, invalidateActive, supported]);

  return {
    supported,
    isSpeaking,
    isBusy: isSpeaking || isPending,
    canReplay,
    speak,
    stop,
    replay,
  };
}
