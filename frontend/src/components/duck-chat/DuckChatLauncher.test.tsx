import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DUCK_SPECIES } from "../../duckSpecies";
import { mockJsonResponse } from "../../test/wakeFixtures";
import { DEFAULT_CONTROLS } from "../../types";
import { DuckChatLauncher } from "./DuckChatLauncher";
import { SUGGESTED_QUESTIONS } from "./DuckChatWindow";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

type UtteranceLike = {
  text: string;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
};

function stubSpeechSynthesis() {
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

  const speak = vi.fn();
  const cancel = vi.fn();

  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    speak,
    cancel,
    getVoices: () => [],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  return {
    utterances,
    speak,
    cancel,
    latest: () => utterances[utterances.length - 1]!,
    fireStart: (utterance: UtteranceLike = utterances[utterances.length - 1]!) => {
      utterance.onstart?.(new Event("start"));
    },
    fireEnd: (utterance: UtteranceLike = utterances[utterances.length - 1]!) => {
      utterance.onend?.(new Event("end"));
    },
  };
}

function renderChat(
  explainImpl: (url: unknown, init?: RequestInit) => Promise<unknown> = async () =>
    mockJsonResponse({ answer: "Quack! The Kelvin angle is about 19.5 degrees." }),
) {
  const fetchMock = vi.fn().mockImplementation(explainImpl);
  vi.stubGlobal("fetch", fetchMock);
  render(
    <DuckChatLauncher species={DEFAULT_DUCK_SPECIES} values={DEFAULT_CONTROLS} />,
  );
  return fetchMock;
}

describe("DuckChatLauncher", () => {
  it("opens and closes the chat window from the launcher", async () => {
    const user = userEvent.setup();
    renderChat();

    const launcher = screen.getByTestId("duck-chat-launcher");
    expect(screen.queryByTestId("duck-chat-window")).not.toBeInTheDocument();

    await user.click(launcher);
    expect(screen.getByTestId("duck-chat-window")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask the Duck" })).toBeInTheDocument();

    await user.click(launcher);
    expect(screen.queryByTestId("duck-chat-window")).not.toBeInTheDocument();
  });

  it("preserves conversation when reopened", async () => {
    const user = userEvent.setup();
    renderChat();

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("duck-chat-announcer")).toHaveTextContent(
        /Kelvin angle/i,
      );
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    expect(screen.queryByTestId("duck-chat-window")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("duck-chat-launcher"));
    expect(
      within(screen.getByTestId("duck-chat-message-assistant")).getByText(
        /Kelvin angle/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("duck-chat-message-user")).getByText(
        SUGGESTED_QUESTIONS[0],
      ),
    ).toBeInTheDocument();
  });

  it("submits a typed question and disables Send while pending", async () => {
    const user = userEvent.setup();
    let resolveExplain!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveExplain = resolve;
    });
    const fetchMock = renderChat(async () => {
      await pending;
      return mockJsonResponse({ answer: "Done." });
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.type(
      screen.getByLabelText(/Ask the duck a physics question/i),
      "What is Froude?",
    );
    const send = screen.getByRole("button", { name: "Send" });
    await user.click(send);

    expect(send).toBeDisabled();
    expect(screen.getByTestId("duck-chat-loading")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExplain(undefined);
    });
    await waitFor(() => {
      expect(
        within(screen.getByTestId("duck-chat-message-assistant")).getByText(
          "Done.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows error and retry", async () => {
    const user = userEvent.setup();
    const fetchMock = renderChat(async () =>
      mockJsonResponse({ detail: "provider down" }, 502),
    );

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[1] }),
    );

    const alert = await screen.findByTestId("duck-chat-error");
    expect(alert).toBeInTheDocument();

    fetchMock.mockImplementation(async () =>
      mockJsonResponse({ answer: "Retry worked." }),
    );
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(
        within(screen.getByTestId("duck-chat-message-assistant")).getByText(
          "Retry worked.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("sets avatar to thinking while loading and stays idle until Speak", async () => {
    const speech = stubSpeechSynthesis();
    const user = userEvent.setup();

    let resolveExplain!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveExplain = resolve;
    });
    renderChat(async () => {
      await pending;
      return mockJsonResponse({
        answer: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      });
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    const avatars = () => screen.getAllByTestId("duck-avatar");

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );
    await waitFor(() => {
      expect(
        avatars().some((node) => node.getAttribute("data-state") === "thinking"),
      ).toBe(true);
    });

    await act(async () => {
      resolveExplain(undefined);
    });

    await waitFor(() => {
      expect(screen.getByTestId("duck-speech-speak")).toBeInTheDocument();
    });
    expect(
      avatars().every((node) => node.getAttribute("data-state") !== "speaking"),
    ).toBe(true);

    await user.click(screen.getByTestId("duck-speech-speak"));
    await act(async () => {
      speech.fireStart();
    });
    expect(
      avatars().some((node) => node.getAttribute("data-state") === "speaking"),
    ).toBe(true);

    await user.click(screen.getByTestId("duck-speech-stop"));
    expect(
      avatars().every((node) => node.getAttribute("data-state") === "idle"),
    ).toBe(true);
  });

  it("hides speech controls when speech synthesis is unsupported", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    const user = userEvent.setup();
    renderChat(async () =>
      mockJsonResponse({ answer: "Text only when TTS is missing." }),
    );

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );

    await waitFor(() => {
      expect(
        within(screen.getByTestId("duck-chat-message-assistant")).getByText(
          /Text only/,
        ),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("duck-speech-controls")).not.toBeInTheDocument();
  });

  it("cancels speech when a new question starts loading", async () => {
    const speech = stubSpeechSynthesis();
    const user = userEvent.setup();

    let resolveSecond!: (value: unknown) => void;
    let callCount = 0;
    renderChat(async () => {
      callCount += 1;
      if (callCount === 1) {
        return mockJsonResponse({ answer: "First answer about Kelvin." });
      }
      return new Promise((resolve) => {
        resolveSecond = resolve;
      });
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("duck-speech-speak")).toBeEnabled();
    });

    await user.click(screen.getByTestId("duck-speech-speak"));
    await act(async () => {
      speech.fireStart();
    });
    expect(
      screen
        .getAllByTestId("duck-avatar")
        .some((node) => node.getAttribute("data-state") === "speaking"),
    ).toBe(true);

    await user.type(
      screen.getByLabelText(/Ask the duck a physics question/i),
      "What is Froude?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => {
      expect(screen.getByTestId("duck-chat-loading")).toBeInTheDocument();
    });
    expect(
      screen
        .getAllByTestId("duck-avatar")
        .every((node) => node.getAttribute("data-state") !== "speaking"),
    ).toBe(true);
    expect(speech.cancel).toHaveBeenCalled();

    await act(async () => {
      resolveSecond(mockJsonResponse({ answer: "Second answer about Froude." }));
    });
  });

  it("replays the last spoken response after a newer answer arrives", async () => {
    const speech = stubSpeechSynthesis();
    const user = userEvent.setup();
    let callCount = 0;
    renderChat(async () => {
      callCount += 1;
      return mockJsonResponse({
        answer: callCount === 1 ? "Spoken first answer." : "Newest unspoken answer.",
      });
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("duck-speech-speak")).toBeEnabled();
    });

    await user.click(screen.getByTestId("duck-speech-speak"));
    await act(async () => {
      speech.fireStart();
      speech.fireEnd();
    });
    expect(speech.latest().text).toBe("Spoken first answer.");

    await user.type(
      screen.getByLabelText(/Ask the duck a physics question/i),
      "What is Froude?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => {
      const assistantBubbles = screen.getAllByTestId("duck-chat-message-assistant");
      expect(
        within(assistantBubbles[assistantBubbles.length - 1]!).getByText(
          "Newest unspoken answer.",
        ),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("duck-speech-replay"));
    expect(speech.latest().text).toBe("Spoken first answer.");

    await act(async () => {
      speech.fireStart();
      speech.fireEnd();
    });

    await user.click(screen.getByTestId("duck-speech-speak"));
    expect(speech.latest().text).toBe("Newest unspoken answer.");
  });

  it("skips decorative speaking animation when reduced motion is preferred", async () => {
    stubSpeechSynthesis();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const user = userEvent.setup();
    renderChat(async () =>
      mockJsonResponse({ answer: "Immediate full answer under reduced motion." }),
    );

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );

    await waitFor(() => {
      expect(
        within(screen.getByTestId("duck-chat-message-assistant")).getByText(
          "Immediate full answer under reduced motion.",
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen
        .getAllByTestId("duck-avatar")
        .every((node) => node.getAttribute("data-state") !== "speaking"),
    ).toBe(true);
  });

  it("does not replay reveal when reopening after the answer finished", async () => {
    stubSpeechSynthesis();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const answer = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    renderChat(async () => mockJsonResponse({ answer }));

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("duck-chat-announcer")).toHaveTextContent(
        answer,
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await waitFor(() => {
      expect(
        screen
          .getAllByTestId("duck-avatar")
          .every((node) => node.getAttribute("data-state") === "idle"),
      ).toBe(true);
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    expect(screen.queryByTestId("duck-chat-window")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("duck-chat-launcher"));
    expect(
      within(screen.getByTestId("duck-chat-message-assistant")).getByText(
        answer,
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("duck-avatar")
        .every((node) => node.getAttribute("data-state") !== "speaking"),
    ).toBe(true);
  });

  it("closing the chat unmounts speaking and cancels playback", async () => {
    const speech = stubSpeechSynthesis();
    const user = userEvent.setup();
    renderChat(async () =>
      mockJsonResponse({ answer: "Long enough answer for speaking state." }),
    );

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("duck-speech-speak")).toBeEnabled();
    });

    await user.click(screen.getByTestId("duck-speech-speak"));
    await act(async () => {
      speech.fireStart();
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    expect(screen.queryByTestId("duck-chat-window")).not.toBeInTheDocument();
    expect(screen.getByTestId("duck-avatar").getAttribute("data-state")).toBe(
      "idle",
    );
    expect(speech.cancel).toHaveBeenCalled();
  });
});

describe("DuckChat and animation frames", () => {
  it("does not call explain from requestAnimationFrame", () => {
    const fetchMock = renderChat();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });

    fireEvent(
      window,
      new Event("resize"), // no-op; ensure rAF callbacks alone never fetch
    );
    for (const cb of frames) {
      cb(performance.now());
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
