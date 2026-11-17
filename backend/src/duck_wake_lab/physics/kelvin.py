"""Simplified deep-water Kelvin wake envelope model."""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


def kelvin_half_angle_rad() -> float:
    """Return the theoretical Kelvin wake half-angle in radians.

    The deep-water Kelvin envelope half-angle is arcsin(1/3).
    """
    return math.asin(1.0 / 3.0)


def kelvin_half_angle_deg() -> float:
    """Return the theoretical Kelvin wake half-angle in degrees."""
    return math.degrees(kelvin_half_angle_rad())


@dataclass(frozen=True, slots=True)
class KelvinWakeBoundaries:
    """Straight Kelvin wake envelope boundaries behind a duck at the origin.

    The duck sits at (0, 0) and swims in the positive x-direction. Wake
    envelope arms extend in the negative x-direction at ± half-angle from
    the wake centerline.

    ``frozen=True`` prevents reassignment of fields, but the NumPy array
    fields remain mutable in place. Callers that need isolation should copy
    the arrays themselves. Future API layers should convert these arrays to
    JSON-compatible lists rather than changing this domain type.
    """

    half_angle_rad: float
    half_angle_deg: float
    port_x_m: np.ndarray
    port_y_m: np.ndarray
    starboard_x_m: np.ndarray
    starboard_y_m: np.ndarray


def kelvin_wake_boundaries(
    wake_length_m: float,
    n_points: int = 51,
) -> KelvinWakeBoundaries:
    """Generate coordinates for the two Kelvin wake envelope boundaries.

    The angle is independent of swimming speed in this simplified model.

    Args:
        wake_length_m: Distance behind the duck to sample, in meters (> 0).
        n_points: Number of sample points along each arm (integer >= 2).

    Returns:
        Structured wake boundary coordinates suitable for later visualization.

    Raises:
        ValueError: If ``wake_length_m`` is non-finite or <= 0, or if
            ``n_points`` is not a true int >= 2 (``bool`` is rejected).
    """
    if not math.isfinite(wake_length_m) or wake_length_m <= 0:
        raise ValueError("wake_length_m must be a finite number greater than 0")
    if type(n_points) is not int or n_points < 2:
        raise ValueError("n_points must be an integer >= 2")

    theta_rad = kelvin_half_angle_rad()
    tan_theta = math.tan(theta_rad)
    s_m = np.linspace(0.0, wake_length_m, n_points)
    port_y_m = s_m * tan_theta
    starboard_y_m = -s_m * tan_theta

    return KelvinWakeBoundaries(
        half_angle_rad=theta_rad,
        half_angle_deg=kelvin_half_angle_deg(),
        port_x_m=-s_m,
        port_y_m=port_y_m,
        starboard_x_m=-s_m,
        starboard_y_m=starboard_y_m,
    )
