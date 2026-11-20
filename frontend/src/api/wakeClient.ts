import { parseWakeResponse, WakeParseError } from "./parseWakeResponse";
import type { WakeRequest, WakeResponse } from "./types";

export class WakeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WakeApiError";
    this.status = status;
  }
}

/**
 * Fetch Kelvin wake geometry from the FastAPI backend.
 */
export async function fetchWake(
  request: WakeRequest,
  signal?: AbortSignal,
): Promise<WakeResponse> {
  const response = await fetch("/api/wake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let detail = `Wake request failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        body.detail !== undefined
      ) {
        detail = `Wake request failed (${response.status}): ${JSON.stringify(body.detail)}`;
      }
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    throw new WakeApiError(detail, response.status);
  }

  try {
    return parseWakeResponse(await response.json());
  } catch (err) {
    const message =
      err instanceof WakeParseError ? err.message : "Invalid wake response";
    throw new WakeApiError(message, response.status);
  }
}
