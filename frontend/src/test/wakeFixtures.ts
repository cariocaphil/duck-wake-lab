import type { WakeResponse } from "../api/types";

export function makeWakeResponse(
  overrides: Partial<WakeResponse> = {},
): WakeResponse {
  return {
    duck_length_m: 0.5,
    speed_m_s: 1.2,
    froude_number: 0.541,
    half_angle_rad: Math.asin(1 / 3),
    half_angle_deg: (Math.asin(1 / 3) * 180) / Math.PI,
    wake_length_m: 5,
    port_x_m: [0, -2.5, -5],
    port_y_m: [0, 0.88, 1.77],
    starboard_x_m: [0, -2.5, -5],
    starboard_y_m: [0, -0.88, -1.77],
    ...overrides,
  };
}
