import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWake, WakeApiError } from "./wakeClient";
import {
  assertWakeResponseSchema,
  expectPostedWake,
  makeWakeResponse,
  mockJsonResponse,
} from "../test/wakeFixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchWake", () => {
  it("posts JSON to same-origin /api/wake and returns the wake response", async () => {
    const wake = makeWakeResponse();
    assertWakeResponseSchema(wake);
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(wake));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWake({
      duck_length_m: 0.5,
      swimming_speed_m_s: 1.2,
    });

    expect(result).toEqual(wake);
    expectPostedWake(fetchMock, {
      duck_length_m: 0.5,
      swimming_speed_m_s: 1.2,
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `${window.location.origin}/api/wake`,
    );
  });

  it("throws WakeApiError with HTTP status on non-OK responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ detail: "invalid" }, 422),
        ),
    );

    await expect(
      fetchWake({ duck_length_m: 0.5, swimming_speed_m_s: 1.2 }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError &&
        err.status === 422 &&
        /422/.test(err.message),
    );
  });

  it("throws Invalid wake response when OK body fails Zod validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse({
          froude_number: 0.5,
          // Missing required wake fields → Zod failure after HTTP 200.
        }),
      ),
    );

    await expect(
      fetchWake({ duck_length_m: 0.5, swimming_speed_m_s: 1.2 }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError &&
        err.status === 200 &&
        err.message === "Invalid wake response",
    );
  });
});
