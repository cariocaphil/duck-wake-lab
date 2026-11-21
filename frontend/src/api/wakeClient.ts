import { ZodError } from "zod";
import { createApi } from "./generated/api.client";
import {
  TypedStatusError,
  type Point2D,
  type WakeRequest,
  type WakeResponse,
} from "./generated/client";

export type { Point2D, WakeRequest, WakeResponse };

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
    // Let abort propagate so useWakeQuery can ignore cancelled requests.
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw err;
    }

    if (err instanceof TypedStatusError) {
      let detail = `Wake request failed (${err.status})`;
      const body: unknown = err.response.data;
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        body.detail !== undefined
      ) {
        detail = `Wake request failed (${err.status}): ${JSON.stringify(body.detail)}`;
      }
      throw new WakeApiError(detail, err.status);
    }

    // Distinct from HTTP failures: Zod/schema error after a successful status.
    if (err instanceof ZodError) {
      throw new WakeApiError("Invalid wake response", 200);
    }

    throw new WakeApiError("Invalid wake response", 200);
  }
}
