import type {
  Point2D,
  WakeResponse,
  WaveFieldResponse,
} from "../api/wakeClient";
import {
  WakeResponse as WakeResponseSchema,
  WaveFieldResponse as WaveFieldResponseSchema,
} from "../api/generated/client";

export function point(x_m: number, y_m: number): Point2D {
  return { x_m, y_m };
}

const KELVIN_DEG = (Math.asin(1 / 3) * 180) / Math.PI;

/** Kelvin-mode response: the apparent wake equals the Kelvin envelope. */
export function makeWakeResponse(
  overrides: Partial<WakeResponse> = {},
): WakeResponse {
  const port_boundary = [point(0, 0), point(-2.5, 0.88), point(-5, 1.77)];
  const starboard_boundary = [point(0, 0), point(-2.5, -0.88), point(-5, -1.77)];
  return {
    physics_mode: "kelvin",
    froude_number: 0.541,
    kelvin_angle_deg: KELVIN_DEG,
    apparent_angle_deg: KELVIN_DEG,
    wake_length_m: 5,
    port_boundary,
    starboard_boundary,
    apparent_port_boundary: port_boundary,
    apparent_starboard_boundary: starboard_boundary,
    ...overrides,
  };
}

/** Advanced-mode response with a narrower apparent wake (Fr ≈ 2). */
export function makeAdvancedWakeResponse(
  overrides: Partial<WakeResponse> = {},
): WakeResponse {
  return makeWakeResponse({
    physics_mode: "advanced",
    froude_number: 2,
    apparent_angle_deg: 14.04,
    apparent_port_boundary: [point(0, 0), point(-2.5, 0.62), point(-5, 1.25)],
    apparent_starboard_boundary: [
      point(0, 0),
      point(-2.5, -0.62),
      point(-5, -1.25),
    ],
    ...overrides,
  });
}

/**
 * Tiny deterministic wave field (5 x 3 grid). The divergent field is weaker
 * than the transverse one, and the combined field is their sum, so shared
 * color-scale behaviour is easy to assert.
 */
export function makeWaveFieldResponse(
  overrides: Partial<WaveFieldResponse> = {},
): WaveFieldResponse {
  const transverse = [
    [0.2, -0.4, 0.6, -0.2, 0],
    [0.4, -0.8, 1.0, -0.4, 0],
    [0.2, -0.4, 0.6, -0.2, 0],
  ];
  const divergent = [
    [0.1, 0.1, -0.1, 0.1, 0],
    [0.2, -0.2, 0.2, -0.2, 0],
    [0.1, 0.1, -0.1, 0.1, 0],
  ];
  const combined = transverse.map((row, j) =>
    row.map((value, i) => Math.round((value + (divergent[j]?.[i] ?? 0)) * 1e4) / 1e4),
  );
  return {
    duck_length_m: 0.55,
    swimming_speed_m_s: 1.2,
    froude_number: 0.516,
    kelvin_angle_deg: KELVIN_DEG,
    wake_length_m: 4,
    transverse_wavelength_m: 1.1,
    divergent_wavelength_m: 0.55,
    nx: 5,
    ny: 3,
    x_m: [-4, -3, -2, -1, 0],
    y_m: [-1.4, 0, 1.4],
    transverse,
    divergent,
    combined,
    ...overrides,
  };
}

/** Assert a wave-field fixture matches the generated Zod schema. */
export function assertWaveFieldResponseSchema(value: unknown): WaveFieldResponse {
  return WaveFieldResponseSchema.parse(value);
}

/** Assert a fixture matches the generated Zod WakeResponse schema. */
export function assertWakeResponseSchema(value: unknown): WakeResponse {
  return WakeResponseSchema.parse(value);
}

/** Minimal fetch Response stand-in for the generated typed-openapi client. */
export function mockJsonResponse(
  body: unknown,
  status = 200,
): {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
} {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

type FetchLike = (url: unknown, init?: RequestInit) => unknown;

/**
 * Stub global fetch so wake, wave-field, and duck-explain requests are routed
 * separately. Page-level tests can keep asserting on the wake mock only.
 * Returns the wave-field mock.
 */
export function stubRoutedFetch(
  wakeFetch: FetchLike,
  waveFetch: FetchLike = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(mockJsonResponse(makeWaveFieldResponse())),
    ),
  duckExplainFetch: FetchLike = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(mockJsonResponse({ answer: "Quack! Test answer." })),
    ),
) {
  vi.stubGlobal("fetch", (url: unknown, init?: RequestInit) => {
    const href = String(url);
    if (href.endsWith("/api/wave-field")) {
      return waveFetch(url, init);
    }
    if (href.endsWith("/api/duck/explain")) {
      return duckExplainFetch(url, init);
    }
    return wakeFetch(url, init);
  });
  return waveFetch;
}

export function expectPostedWake(
  fetchMock: {
    mock: {
      calls: unknown[][];
    };
  },
  body: {
    duck_length_m: number;
    swimming_speed_m_s: number;
    physics_mode?: "kelvin" | "advanced";
  },
  callIndex = -1,
): void {
  const calls = fetchMock.mock.calls;
  const index = callIndex < 0 ? calls.length + callIndex : callIndex;
  const call = calls[index];
  if (call === undefined) {
    throw new Error(`expected fetch call at index ${index}`);
  }
  const [url, init] = call as [unknown, RequestInit | undefined];
  expect(String(url)).toMatch(/\/api\/wake$/);
  expect(init).toEqual(
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        duck_length_m: body.duck_length_m,
        swimming_speed_m_s: body.swimming_speed_m_s,
        physics_mode: body.physics_mode ?? "kelvin",
      }),
    }),
  );
}
