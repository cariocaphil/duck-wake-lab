import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockJsonResponse } from "../test/wakeFixtures";
import { DEFAULT_CONTROLS } from "../types";
import { useDuckChat } from "./useDuckChat";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const simulation = {
  species: "mallard" as const,
  values: DEFAULT_CONTROLS,
};

function stubExplain(
  impl: (url: unknown, init?: RequestInit) => Promise<unknown>,
) {
  const fetchMock = vi.fn().mockImplementation(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useDuckChat", () => {
  it("toggles open state and preserves messages when closed", async () => {
    stubExplain(async () =>
      mockJsonResponse({ answer: "Quack! Kelvin half-angle is about 19.5°." }),
    );

    const { result } = renderHook(() => useDuckChat(simulation));
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.send("Why a V?");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[1]?.content).toContain("Kelvin");

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.open();
    });
    expect(result.current.messages).toHaveLength(2);
  });

  it("posts current simulation context and prior history", async () => {
    const fetchMock = stubExplain(async () =>
      mockJsonResponse({ answer: "First answer." }),
    );

    const { result } = renderHook(() =>
      useDuckChat({
        species: "teal",
        values: {
          duckLengthM: 0.35,
          speedMS: 1.5,
          physicsMode: "advanced",
        },
      }),
    );

    act(() => {
      result.current.send("What is Froude?");
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    const firstBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as {
      question: string;
      context: Record<string, unknown>;
      history: unknown[];
    };
    expect(firstBody.question).toBe("What is Froude?");
    expect(firstBody.context).toEqual({
      species: "teal",
      duck_length_m: 0.35,
      swimming_speed_m_s: 1.5,
      physics_mode: "advanced",
    });
    expect(firstBody.history).toEqual([]);

    act(() => {
      result.current.send("And if I double speed?");
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(4));

    const secondBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as { history: Array<{ role: string; content: string }> };
    expect(secondBody.history).toEqual([
      { role: "user", content: "What is Froude?" },
      { role: "assistant", content: "First answer." },
    ]);
  });

  it("disables overlapping sends while pending and ignores stale responses", async () => {
    let resolveFirst!: (value: unknown) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    let call = 0;
    stubExplain(async () => {
      call += 1;
      if (call === 1) {
        await first;
        return mockJsonResponse({ answer: "Stale answer" });
      }
      return mockJsonResponse({ answer: "Fresh answer" });
    });

    const { result } = renderHook(() => useDuckChat(simulation));

    act(() => {
      result.current.send("First");
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.send("Should be ignored");
    });
    expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(
      1,
    );

    await act(async () => {
      resolveFirst(undefined);
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.messages.at(-1)?.content).toBe("Stale answer");
  });

  it("surfaces errors and supports retry without duplicating the user turn", async () => {
    const fetchMock = stubExplain(async () =>
      mockJsonResponse({ detail: "down" }, 502),
    );

    const { result } = renderHook(() => useDuckChat(simulation));
    act(() => {
      result.current.send("Why waves?");
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/502|failed/i);
    const failedUserId = result.current.messages[0]?.id;
    expect(failedUserId).toBeDefined();

    fetchMock.mockImplementation(async () =>
      mockJsonResponse({ answer: "Recovered." }),
    );
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.messages.at(-1)?.content).toBe("Recovered.");

    const userTurns = result.current.messages.filter((m) => m.role === "user");
    expect(userTurns).toHaveLength(1);
    expect(userTurns[0]?.content).toBe("Why waves?");
    expect(userTurns[0]?.id).toBe(failedUserId);
    expect(result.current.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  it("retry reuses the failed user turn and posts prior history only once", async () => {
    const fetchMock = stubExplain(async () =>
      mockJsonResponse({ answer: "ok" }),
    );

    const { result } = renderHook(() => useDuckChat(simulation));
    act(() => {
      result.current.send("First ok");
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    fetchMock.mockImplementation(async () =>
      mockJsonResponse({ detail: "down" }, 502),
    );
    act(() => {
      result.current.send("Retry me");
    });
    await waitFor(() => expect(result.current.status).toBe("error"));

    const userIdBeforeRetry = result.current.messages.find(
      (m) => m.role === "user" && m.content === "Retry me",
    )?.id;

    fetchMock.mockImplementation(async () =>
      mockJsonResponse({ answer: "Second try worked." }),
    );
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    const retryUsers = result.current.messages.filter(
      (m) => m.role === "user" && m.content === "Retry me",
    );
    expect(retryUsers).toHaveLength(1);
    expect(retryUsers[0]?.id).toBe(userIdBeforeRetry);

    const lastBody = JSON.parse(
      String(fetchMock.mock.calls.at(-1)?.[1]?.body),
    ) as {
      question: string;
      history: Array<{ role: string; content: string }>;
    };
    expect(lastBody.question).toBe("Retry me");
    expect(lastBody.history).toEqual([
      { role: "user", content: "First ok" },
      { role: "assistant", content: "ok" },
    ]);
  });

  it("stores the complete answer immediately (not presentation-dependent)", async () => {
    stubExplain(async () =>
      mockJsonResponse({
        answer: "Quack! Full complete answer for history.",
      }),
    );
    const { result } = renderHook(() => useDuckChat(simulation));
    act(() => {
      result.current.send("Explain");
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1]?.content).toBe(
      "Quack! Full complete answer for history.",
    );
  });
});
