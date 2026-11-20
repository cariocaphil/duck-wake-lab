"""Simplified deep-water Kelvin wake envelope model."""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


# Deep-water Kelvin envelope half-angle: arcsin(1/3) ≈ 19.47°.
KELVIN_HALF_ANGLE_RAD = math.asin(1.0 / 3.0)
KELVIN_HALF_ANGLE_DEG = math.degrees(KELVIN_HALF_ANGLE_RAD)


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

    tan_theta = math.tan(KELVIN_HALF_ANGLE_RAD)
    s_m = np.linspace(0.0, wake_length_m, n_points)
    # Separate arrays so in-place edits to one arm cannot mutate the other.
    port_x_m = -s_m
    starboard_x_m = port_x_m.copy()
    port_y_m = s_m * tan_theta
    starboard_y_m = -s_m * tan_theta

    return KelvinWakeBoundaries(
        half_angle_rad=KELVIN_HALF_ANGLE_RAD,
        half_angle_deg=KELVIN_HALF_ANGLE_DEG,
        port_x_m=port_x_m,
        port_y_m=port_y_m,
        starboard_x_m=starboard_x_m,
        starboard_y_m=starboard_y_m,
    )
