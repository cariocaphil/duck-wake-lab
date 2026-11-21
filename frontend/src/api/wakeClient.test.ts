import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchDuckExplain,
  fetchWake,
  fetchWaveField,
  WakeApiError,
} from "./wakeClient";
import {
  assertWakeResponseSchema,
  assertWaveFieldResponseSchema,
  makeWaveFieldResponse,
  expectPostedWake,
  makeAdvancedWakeResponse,
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
      physics_mode: "kelvin",
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
      fetchWake({
        duck_length_m: 0.5,
        swimming_speed_m_s: 1.2,
        physics_mode: "kelvin",
      }),
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
      fetchWake({
        duck_length_m: 0.5,
        swimming_speed_m_s: 1.2,
        physics_mode: "kelvin",
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError &&
        err.status === 200 &&
        err.message === "Invalid wake response",
    );
  });

  it("posts physics_mode advanced and parses both angles", async () => {
    const wake = makeAdvancedWakeResponse();
    assertWakeResponseSchema(wake);
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(wake));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWake({
      duck_length_m: 0.35,
      swimming_speed_m_s: 3.0,
      physics_mode: "advanced",
    });

    expect(result.apparent_angle_deg).toBeLessThan(result.kelvin_angle_deg);
    expectPostedWake(fetchMock, {
      duck_length_m: 0.35,
      swimming_speed_m_s: 3.0,
      physics_mode: "advanced",
    });
  });
});

describe("fetchWaveField", () => {
  it("posts length and speed to same-origin /api/wave-field", async () => {
    const wave = makeWaveFieldResponse();
    assertWaveFieldResponseSchema(wave);
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(wave));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWaveField({
      duck_length_m: 0.5,
      swimming_speed_m_s: 1.2,
    });

    expect(result).toEqual(wave);
    const [url, init] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    expect(String(url)).toBe(`${window.location.origin}/api/wave-field`);
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ duck_length_m: 0.5, swimming_speed_m_s: 1.2 }),
      }),
    );
  });

  it("throws WakeApiError with HTTP status on non-OK responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ detail: "invalid" }, 422)),
    );
    await expect(
      fetchWaveField({ duck_length_m: 0.5, swimming_speed_m_s: 1.2 }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError &&
        err.status === 422 &&
        /Wave-field request failed \(422\)/.test(err.message),
    );
  });

  it("throws Invalid wave-field response when the body fails Zod validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ nx: 3 })),
    );
    await expect(
      fetchWaveField({ duck_length_m: 0.5, swimming_speed_m_s: 1.2 }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError &&
        err.status === 200 &&
        err.message === "Invalid wave-field response",
    );
  });

  it("rethrows aborts untouched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    );
    await expect(
      fetchWaveField({ duck_length_m: 0.5, swimming_speed_m_s: 1.2 }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DOMException && err.name === "AbortError",
    );
  });
});

describe("fetchDuckExplain", () => {
  it("posts question, context, and history to /api/duck/explain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse({ answer: "Quack!" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDuckExplain({
      question: "Why a V?",
      context: {
        species: "mallard",
        duck_length_m: 0.55,
        swimming_speed_m_s: 0.8,
        physics_mode: "kelvin",
      },
      history: [{ role: "user", content: "Hi" }],
    });

    expect(result).toEqual({ answer: "Quack!" });
    const [url, init] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    expect(String(url)).toBe(`${window.location.origin}/api/duck/explain`);
    expect(JSON.parse(String(init.body))).toEqual({
      question: "Why a V?",
      context: {
        species: "mallard",
        duck_length_m: 0.55,
        swimming_speed_m_s: 0.8,
        physics_mode: "kelvin",
      },
      history: [{ role: "user", content: "Hi" }],
    });
  });

  it("throws WakeApiError on provider failure status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse({ detail: "Speaking Duck is not configured." }, 503),
      ),
    );
    await expect(
      fetchDuckExplain({
        question: "Why?",
        context: {
          species: "mallard",
          duck_length_m: 0.55,
          swimming_speed_m_s: 0.8,
        },
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof WakeApiError &&
        err.status === 503 &&
        /Duck explain request failed \(503\)/.test(err.message),
    );
  });
});
