import type { WakeResponse } from "./types";

export class WakeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WakeParseError";
  }
}

const SCALAR_KEYS = [
  "duck_length_m",
  "speed_m_s",
  "froude_number",
  "half_angle_rad",
  "half_angle_deg",
  "wake_length_m",
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseFiniteNumberArray(value: unknown, name: string): number[] {
  if (!Array.isArray(value)) {
    throw new WakeParseError(`Invalid wake response: ${name} must be an array`);
  }
  if (!value.every(isFiniteNumber)) {
    throw new WakeParseError(
      `Invalid wake response: ${name} must contain only finite numbers`,
    );
  }
  return value;
}

/**
 * Runtime-validate POST /api/wake JSON against the WakeResponse contract.
 */
export function parseWakeResponse(value: unknown): WakeResponse {
  if (typeof value !== "object" || value === null) {
    throw new WakeParseError("Invalid wake response: expected an object");
  }

  const record = value as Record<string, unknown>;
  const scalars: Record<(typeof SCALAR_KEYS)[number], number> = {
    duck_length_m: 0,
    speed_m_s: 0,
    froude_number: 0,
    half_angle_rad: 0,
    half_angle_deg: 0,
    wake_length_m: 0,
  };

  for (const key of SCALAR_KEYS) {
    if (!(key in record) || !isFiniteNumber(record[key])) {
      throw new WakeParseError(
        `Invalid wake response: ${key} must be a finite number`,
      );
    }
    scalars[key] = record[key];
  }

  const arrays = {
    port_x_m: parseFiniteNumberArray(record.port_x_m, "port_x_m"),
    port_y_m: parseFiniteNumberArray(record.port_y_m, "port_y_m"),
    starboard_x_m: parseFiniteNumberArray(record.starboard_x_m, "starboard_x_m"),
    starboard_y_m: parseFiniteNumberArray(record.starboard_y_m, "starboard_y_m"),
  };

  const lengths = new Set(Object.values(arrays).map((arr) => arr.length));
  if (lengths.size !== 1) {
    throw new WakeParseError(
      "Invalid wake response: port and starboard arrays must have the same length",
    );
  }
  const n = lengths.values().next().value ?? 0;
  if (n < 2) {
    throw new WakeParseError(
      "Invalid wake response: coordinate arrays must contain at least 2 points",
    );
  }

  if (
    arrays.port_x_m[0] !== 0 ||
    arrays.port_y_m[0] !== 0 ||
    arrays.starboard_x_m[0] !== 0 ||
    arrays.starboard_y_m[0] !== 0
  ) {
    throw new WakeParseError(
      "Invalid wake response: wake arms must start at the origin (0, 0)",
    );
  }

  return { ...scalars, ...arrays };
}
