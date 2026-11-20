/** Request body for POST /api/wake. */
export interface WakeRequest {
  duck_length_m: number;
  speed_m_s: number;
}

/** Response body from POST /api/wake. */
export interface WakeResponse {
  duck_length_m: number;
  speed_m_s: number;
  froude_number: number;
  half_angle_rad: number;
  half_angle_deg: number;
  wake_length_m: number;
  port_x_m: number[];
  port_y_m: number[];
  starboard_x_m: number[];
  starboard_y_m: number[];
}
