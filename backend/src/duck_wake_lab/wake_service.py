"""Orchestrate physics domain calls for the wake API."""

from __future__ import annotations

from duck_wake_lab.physics import (
    DuckParameters,
    PhysicsMode,
    apparent_wake_boundaries,
    apparent_wake_half_angle_rad,
    froude_number,
    kelvin_wake_boundaries,
)
from duck_wake_lab.schemas import Point2D, WakeRequest, WakeResponse

# Sample extent behind the duck scales with body length (API layer only).
WAKE_LENGTH_FACTOR = 10.0
WAKE_N_POINTS = 51


def _to_points(xs, ys) -> list[Point2D]:
    return [
        Point2D(x_m=float(x), y_m=float(y)) for x, y in zip(xs, ys, strict=True)
    ]


def compute_wake(request: WakeRequest) -> WakeResponse:
    """Compute Froude number and wake boundaries for a request.

    The Kelvin envelope is always the classical fixed-angle envelope. In
    ``kelvin`` mode the apparent wake equals the envelope; in ``advanced``
    mode it uses the simplified Froude-dependent apparent angle.
    """
    # API/UI: duck_length_m → physics: body_length_m (sole mapping bridge).
    params = DuckParameters(
        body_length_m=request.duck_length_m,
        speed_m_s=request.swimming_speed_m_s,
    )
    wake_length_m = request.duck_length_m * WAKE_LENGTH_FACTOR
    froude = froude_number(params)
    wake = kelvin_wake_boundaries(
        wake_length_m=wake_length_m,
        n_points=WAKE_N_POINTS,
    )

    port_boundary = _to_points(wake.port_x_m, wake.port_y_m)
    starboard_boundary = _to_points(wake.starboard_x_m, wake.starboard_y_m)

    if request.physics_mode == PhysicsMode.ADVANCED:
        apparent = apparent_wake_boundaries(
            half_angle_rad=apparent_wake_half_angle_rad(froude),
            wake_length_m=wake_length_m,
            n_points=WAKE_N_POINTS,
        )
        apparent_angle_deg = apparent.half_angle_deg
        apparent_port = _to_points(apparent.port_x_m, apparent.port_y_m)
        apparent_starboard = _to_points(
            apparent.starboard_x_m, apparent.starboard_y_m
        )
    else:
        apparent_angle_deg = wake.half_angle_deg
        apparent_port = list(port_boundary)
        apparent_starboard = list(starboard_boundary)

    return WakeResponse(
        physics_mode=request.physics_mode,
        froude_number=froude,
        kelvin_angle_deg=wake.half_angle_deg,
        apparent_angle_deg=apparent_angle_deg,
        wake_length_m=wake_length_m,
        port_boundary=port_boundary,
        starboard_boundary=starboard_boundary,
        apparent_port_boundary=apparent_port,
        apparent_starboard_boundary=apparent_starboard,
    )
