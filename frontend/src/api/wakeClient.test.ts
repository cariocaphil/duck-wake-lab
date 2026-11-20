import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWake, WakeApiError } from "./wakeClient";
import { makeWakeResponse } from "../test/wakeFixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchWake", () => {
  it("posts JSON and returns the wake response", async () => {
    const wake = makeWakeResponse();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => wake,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWake({ duck_length_m: 0.5, speed_m_s: 1.2 });

    expect(result).toEqual(wake);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wake",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ duck_length_m: 0.5, speed_m_s: 1.2 }),
      }),
    );
  });

  it("throws WakeApiError on non-OK responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: "invalid" }),
      }),
    );

    await expect(
      fetchWake({ duck_length_m: 0.5, speed_m_s: 1.2 }),
    ).rejects.toBeInstanceOf(WakeApiError);
  });

  it("throws WakeApiError when the OK body fails contract checks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () =>
          makeWakeResponse({
            starboard_y_m: [0, -0.88],
          }),
      }),
    );

    await expect(
      fetchWake({ duck_length_m: 0.5, speed_m_s: 1.2 }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError && /same length/.test(err.message),
    );
  });
});
