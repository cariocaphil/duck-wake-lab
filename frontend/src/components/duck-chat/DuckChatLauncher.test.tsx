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

  it("sets avatar to thinking while loading and speaking during reveal", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });

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
      expect(
        avatars().some((node) => node.getAttribute("data-state") === "speaking"),
      ).toBe(true);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => {
      expect(
        avatars().every((node) => node.getAttribute("data-state") === "idle"),
      ).toBe(true);
    });
  });

  it("skips decorative speaking animation when reduced motion is preferred", async () => {
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

  it("closing the chat unmounts speaking reveal", async () => {
    const user = userEvent.setup();
    renderChat(async () =>
      mockJsonResponse({ answer: "Long enough answer for speaking state." }),
    );

    await user.click(screen.getByTestId("duck-chat-launcher"));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("duck-chat-announcer")).toHaveTextContent(
        /Long enough/,
      );
    });

    await user.click(screen.getByTestId("duck-chat-launcher"));
    expect(screen.queryByTestId("duck-chat-window")).not.toBeInTheDocument();
    expect(screen.getByTestId("duck-avatar").getAttribute("data-state")).toBe(
      "idle",
    );
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
