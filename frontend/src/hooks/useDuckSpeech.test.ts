import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDuckSpeech } from "./useDuckSpeech";

type UtteranceLike = {
  text: string;
  pitch: number;
  rate: number;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
};

function createSpeechMock() {
  const utterances: UtteranceLike[] = [];

  class FakeUtterance {
    text: string;
    pitch = 1;
    rate = 1;
    lang = "";
    voice: SpeechSynthesisVoice | null = null;
    onstart: ((ev: Event) => void) | null = null;
    onend: ((ev: Event) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;

    constructor(text: string) {
      this.text = text;
      utterances.push(this);
    }
  }

  const speak = vi.fn((_utterance: UtteranceLike) => {
    // Utterance is already tracked via FakeUtterance construction.
  });
  const cancel = vi.fn();
  const getVoices = vi.fn(() => [] as SpeechSynthesisVoice[]);

  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    speak,
    cancel,
    getVoices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  return {
    utterances,
    speak,
    cancel,
    getVoices,
    latest: () => utterances[utterances.length - 1]!,
    fireStart: (utterance: UtteranceLike) => {
      utterance.onstart?.(new Event("start"));
    },
    fireEnd: (utterance: UtteranceLike) => {
      utterance.onend?.(new Event("end"));
    },
    fireError: (utterance: UtteranceLike) => {
      utterance.onerror?.(new Event("error") as SpeechSynthesisErrorEvent);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useDuckSpeech", () => {
  it("reports unsupported and no-ops when speechSynthesis is missing", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    const { result } = renderHook(() => useDuckSpeech());

    expect(result.current.supported).toBe(false);

    act(() => {
      result.current.speak("Hello");
      result.current.stop();
      result.current.replay();
    });

    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.canReplay).toBe(false);
  });

  it("starts speaking and updates state on utterance start and end", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Kelvin wakes form a V.");
    });

    expect(mock.cancel).toHaveBeenCalled();
    expect(mock.speak).toHaveBeenCalledTimes(1);
    expect(result.current.isBusy).toBe(true);
    expect(result.current.isSpeaking).toBe(false);

    const utterance = mock.latest();
    expect(utterance.text).toBe("Kelvin wakes form a V.");
    expect(utterance.pitch).toBe(1.45);
    expect(utterance.rate).toBe(1.2);

    act(() => {
      mock.fireStart(utterance);
    });
    expect(result.current.isSpeaking).toBe(true);
    expect(result.current.isBusy).toBe(true);
    expect(result.current.canReplay).toBe(true);

    act(() => {
      mock.fireEnd(utterance);
    });
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isBusy).toBe(false);
  });

  it("stops speech and clears speaking state", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Stop me.");
    });
    act(() => {
      mock.fireStart(mock.latest());
    });
    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      result.current.stop();
    });
    expect(mock.cancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isBusy).toBe(false);
  });

  it("replays the last spoken text, not a newer unspoken string", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Answer A");
    });
    const first = mock.latest();
    act(() => {
      mock.fireStart(first);
      mock.fireEnd(first);
    });

    act(() => {
      result.current.replay();
    });
    expect(mock.latest().text).toBe("Answer A");

    act(() => {
      mock.fireStart(mock.latest());
      mock.fireEnd(mock.latest());
    });

    // Speak a different text, then replay should still be able to speak A
    // only after A started; after speaking B, last spoken becomes B.
    act(() => {
      result.current.speak("Answer B");
    });
    act(() => {
      mock.fireStart(mock.latest());
      mock.fireEnd(mock.latest());
    });

    act(() => {
      result.current.replay();
    });
    expect(mock.latest().text).toBe("Answer B");
  });

  it("ignores duplicate speak of the same text while pending", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Same text");
      result.current.speak("Same text");
    });

    expect(mock.speak).toHaveBeenCalledTimes(1);
  });

  it("replaces in-flight speech when speak is called with different text", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Response A");
    });
    const first = mock.latest();
    act(() => {
      mock.fireStart(first);
    });

    act(() => {
      result.current.speak("Response B");
    });
    expect(mock.speak).toHaveBeenCalledTimes(2);
    const second = mock.latest();
    expect(second.text).toBe("Response B");
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isBusy).toBe(true);

    act(() => {
      mock.fireStart(second);
    });
    expect(result.current.isSpeaking).toBe(true);
  });

  it("ignores stale onend from a cancelled utterance", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Response A");
    });
    const first = mock.latest();
    act(() => {
      mock.fireStart(first);
    });

    act(() => {
      result.current.speak("Response B");
    });
    const second = mock.latest();
    act(() => {
      mock.fireStart(second);
    });
    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      mock.fireEnd(first);
    });
    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      mock.fireEnd(second);
    });
    expect(result.current.isSpeaking).toBe(false);
  });

  it("clears speaking state on speech error for the active utterance", () => {
    const mock = createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Boom");
    });
    const utterance = mock.latest();
    act(() => {
      mock.fireStart(utterance);
    });
    act(() => {
      mock.fireError(utterance);
    });

    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isBusy).toBe(false);
  });

  it("cancels speech on unmount", () => {
    const mock = createSpeechMock();
    const { result, unmount } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Unmount me");
    });
    act(() => {
      mock.fireStart(mock.latest());
    });

    unmount();
    expect(mock.cancel).toHaveBeenCalled();
  });

  it("does not enable replay until an utterance has started", () => {
    createSpeechMock();
    const { result } = renderHook(() => useDuckSpeech());

    act(() => {
      result.current.speak("Pending only");
    });
    expect(result.current.canReplay).toBe(false);

    act(() => {
      result.current.replay();
    });
    expect(result.current.canReplay).toBe(false);
  });
});
