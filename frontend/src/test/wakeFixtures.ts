import type { Point2D, WakeResponse } from "../api/wakeClient";
import { WakeResponse as WakeResponseSchema } from "../api/generated/client";

export function point(x_m: number, y_m: number): Point2D {
  return { x_m, y_m };
}

export function makeWakeResponse(
  overrides: Partial<WakeResponse> = {},
): WakeResponse {
  return {
    froude_number: 0.541,
    kelvin_angle_deg: (Math.asin(1 / 3) * 180) / Math.PI,
    wake_length_m: 5,
    port_boundary: [point(0, 0), point(-2.5, 0.88), point(-5, 1.77)],
    starboard_boundary: [point(0, 0), point(-2.5, -0.88), point(-5, -1.77)],
    ...overrides,
  };
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

export function expectPostedWake(
  fetchMock: {
    mock: {
      calls: unknown[][];
    };
  },
  body: { duck_length_m: number; swimming_speed_m_s: number },
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
      body: JSON.stringify(body),
    }),
  );
}
