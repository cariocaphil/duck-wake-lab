"""Orchestrate physics domain calls for the wake API."""

from __future__ import annotations

from duck_wake_lab.physics import (
    DuckParameters,
    froude_number,
    kelvin_wake_boundaries,
)
from duck_wake_lab.schemas import WakeRequest, WakeResponse

# Sample extent behind the duck scales with body length (API layer only).
WAKE_LENGTH_FACTOR = 10.0
WAKE_N_POINTS = 51


def compute_wake(request: WakeRequest) -> WakeResponse:
    """Compute Froude number and Kelvin wake boundaries for a request."""
    params = DuckParameters(
        body_length_m=request.duck_length_m,
        speed_m_s=request.speed_m_s,
    )
    wake_length_m = request.duck_length_m * WAKE_LENGTH_FACTOR
    wake = kelvin_wake_boundaries(
        wake_length_m=wake_length_m,
        n_points=WAKE_N_POINTS,
    )

    return WakeResponse(
        duck_length_m=request.duck_length_m,
        speed_m_s=request.speed_m_s,
        froude_number=froude_number(params),
        half_angle_rad=wake.half_angle_rad,
        half_angle_deg=wake.half_angle_deg,
        wake_length_m=wake_length_m,
        port_x_m=wake.port_x_m.tolist(),
        port_y_m=wake.port_y_m.tolist(),
        starboard_x_m=wake.starboard_x_m.tolist(),
        starboard_y_m=wake.starboard_y_m.tolist(),
    )
