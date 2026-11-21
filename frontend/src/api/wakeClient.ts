import { createApi } from "./generated/api.client";
import {
  TypedStatusError,
  type DuckExplainRequest,
  type DuckExplainResponse,
  type Point2D,
  type WakeRequest,
  type WakeResponse,
  type WaveFieldRequest,
  type WaveFieldResponse,
} from "./generated/client";

export type {
  DuckExplainRequest,
  DuckExplainResponse,
  Point2D,
  WakeRequest,
  WakeResponse,
  WaveFieldRequest,
  WaveFieldResponse,
};

export class WakeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WakeApiError";
    this.status = status;
  }
}

/**
 * Same-origin base so browser requests hit `/api/...` through the Vite proxy.
 * Empty string is unsafe: generated client does `new URL(baseUrl + path)`.
 */
function apiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://127.0.0.1:5173";
}

const api = createApi(apiBaseUrl());

function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/**
 * Map a failed request to a WakeApiError. Aborts are rethrown untouched so
 * query hooks can ignore cancelled requests.
 */
function toApiError(
  err: unknown,
  requestLabel: string,
  responseLabel: string,
): unknown {
  if (isAbort(err)) {
    return err;
  }

  if (err instanceof TypedStatusError) {
    let detail = `${requestLabel} failed (${err.status})`;
    const body: unknown = err.response.data;
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      body.detail !== undefined
    ) {
      detail = `${requestLabel} failed (${err.status}): ${JSON.stringify(body.detail)}`;
    }
    return new WakeApiError(detail, err.status);
  }

  // Distinct from HTTP failures: Zod/schema error after a successful status.
  return new WakeApiError(`Invalid ${responseLabel} response`, 200);
}

/**
 * Fetch Kelvin wake geometry from the FastAPI backend via the generated client.
 */
export async function fetchWake(
  request: WakeRequest,
  signal?: AbortSignal,
): Promise<WakeResponse> {
  try {
    return await api.post("/api/wake", {
      body: request,
      overrides: { signal },
      throwOnStatusError: true,
    });
  } catch (err) {
    throw toApiError(err, "Wake request", "wake");
  }
}

/**
 * Fetch the illustrative wave-interference field. Depends only on duck
 * length and swimming speed.
 */
export async function fetchWaveField(
  request: WaveFieldRequest,
  signal?: AbortSignal,
): Promise<WaveFieldResponse> {
  try {
    return await api.post("/api/wave-field", {
      body: request,
      overrides: { signal },
      throwOnStatusError: true,
    });
  } catch (err) {
    throw toApiError(err, "Wave-field request", "wave-field");
  }
}

/**
 * Ask the speaking duck a physics question (OpenAI on the backend only).
 */
export async function fetchDuckExplain(
  request: DuckExplainRequest,
  signal?: AbortSignal,
): Promise<DuckExplainResponse> {
  try {
    return await api.post("/api/duck/explain", {
      body: request,
      overrides: { signal },
      throwOnStatusError: true,
    });
  } catch (err) {
    throw toApiError(err, "Duck explain request", "duck explain");
  }
}
