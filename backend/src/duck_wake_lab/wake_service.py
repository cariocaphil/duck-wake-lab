"""Orchestrate physics domain calls for the wake API."""

from __future__ import annotations

from duck_wake_lab.physics import (
    DuckParameters,
    froude_number,
    kelvin_wake_boundaries,
)
from duck_wake_lab.schemas import Point2D, WakeRequest, WakeResponse

# Sample extent behind the duck scales with body length (API layer only).
WAKE_LENGTH_FACTOR = 10.0
WAKE_N_POINTS = 51


def compute_wake(request: WakeRequest) -> WakeResponse:
    """Compute Froude number and Kelvin wake boundaries for a request."""
    # API/UI: duck_length_m → physics: body_length_m (sole mapping bridge).
    params = DuckParameters(
        body_length_m=request.duck_length_m,
        speed_m_s=request.swimming_speed_m_s,
    )
    wake_length_m = request.duck_length_m * WAKE_LENGTH_FACTOR
    wake = kelvin_wake_boundaries(
        wake_length_m=wake_length_m,
        n_points=WAKE_N_POINTS,
    )

    port_boundary = [
        Point2D(x_m=float(x), y_m=float(y))
        for x, y in zip(wake.port_x_m, wake.port_y_m, strict=True)
    ]
    starboard_boundary = [
        Point2D(x_m=float(x), y_m=float(y))
        for x, y in zip(wake.starboard_x_m, wake.starboard_y_m, strict=True)
    ]

    return WakeResponse(
        froude_number=froude_number(params),
        kelvin_angle_deg=wake.half_angle_deg,
        wake_length_m=wake_length_m,
        port_boundary=port_boundary,
        starboard_boundary=starboard_boundary,
    )
