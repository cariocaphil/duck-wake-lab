"""Simplified Froude-dependent apparent wake model (educational).

Two distinct geometric concepts are kept separate:

* The **Kelvin envelope** half-angle, ``asin(1/3) ≈ 19.47°``. It never
  changes with speed (see ``kelvin.py``).
* The **apparent wake** half-angle: the angle of the most visible wave
  pattern. Here it is approximated by::

      theta_apparent = min(theta_kelvin, atan(0.5 / Fr))

  with the length-based Froude number ``Fr = v / sqrt(g L)``.

Limitations
-----------
This is an illustrative approximation, **not** a universally valid
hydrodynamic law. The coefficient 0.5 is not derived from the water-wave
equations. There is no wave interference, amplitude field, finite-depth,
surface-tension or hull-shape effect, and a duck is not a ship hull. The
apparent angle equals the Kelvin angle until ``Fr > 0.5 / tan(theta_kelvin)
≈ 1.414``; only above that does it narrow.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from duck_wake_lab.physics.kelvin import KELVIN_HALF_ANGLE_RAD

# Empirical, illustrative coefficient in atan(COEFFICIENT / Fr).
APPARENT_ANGLE_COEFFICIENT = 0.5

# Froude number above which the apparent angle falls below the Kelvin angle.
APPARENT_ANGLE_THRESHOLD_FROUDE = APPARENT_ANGLE_COEFFICIENT / math.tan(
    KELVIN_HALF_ANGLE_RAD
)


@dataclass(frozen=True, slots=True)
class ApparentWakeBoundaries:
    """Straight apparent-wake arms behind a duck at the origin.

    Same coordinate convention as ``KelvinWakeBoundaries``: the duck swims in
    +x and the arms extend in -x at ± ``half_angle`` from the centerline.
    """

    half_angle_rad: float
    half_angle_deg: float
    port_x_m: np.ndarray
    port_y_m: np.ndarray
    starboard_x_m: np.ndarray
    starboard_y_m: np.ndarray


def apparent_wake_half_angle_rad(froude: float) -> float:
    """Return the simplified apparent wake half-angle in radians.

    ``min(theta_kelvin, atan(0.5 / Fr))``. Zero Froude number (no motion)
    returns the Kelvin angle rather than dividing by zero.

    Args:
        froude: Length-based Froude number (finite, >= 0).

    Raises:
        ValueError: If ``froude`` is not a finite real number >= 0
            (``bool`` is rejected).
    """
    if (
        isinstance(froude, bool)
        or not isinstance(froude, int | float)
        or not math.isfinite(froude)
        or froude < 0
    ):
        raise ValueError("froude must be a finite number greater than or equal to 0")

    if froude == 0:
        return KELVIN_HALF_ANGLE_RAD
    return min(KELVIN_HALF_ANGLE_RAD, math.atan(APPARENT_ANGLE_COEFFICIENT / froude))


def apparent_wake_boundaries(
    half_angle_rad: float,
    wake_length_m: float,
    n_points: int = 51,
) -> ApparentWakeBoundaries:
    """Generate the two apparent-wake arms for a given half-angle.

    Args:
        half_angle_rad: Arm half-angle in radians, in (0, pi/2).
        wake_length_m: Distance behind the duck to sample, in meters (> 0).
        n_points: Number of sample points per arm (integer >= 2).

    Raises:
        ValueError: On invalid ``half_angle_rad``, ``wake_length_m`` or
            ``n_points`` (same rules as ``kelvin_wake_boundaries``).
    """
    if (
        not math.isfinite(half_angle_rad)
        or half_angle_rad <= 0
        or half_angle_rad >= math.pi / 2
    ):
        raise ValueError("half_angle_rad must be a finite number in (0, pi/2)")
    if not math.isfinite(wake_length_m) or wake_length_m <= 0:
        raise ValueError("wake_length_m must be a finite number greater than 0")
    if type(n_points) is not int or n_points < 2:
        raise ValueError("n_points must be an integer >= 2")

    tan_theta = math.tan(half_angle_rad)
    s_m = np.linspace(0.0, wake_length_m, n_points)
    port_x_m = -s_m
    starboard_x_m = port_x_m.copy()
    port_y_m = s_m * tan_theta
    starboard_y_m = -s_m * tan_theta

    return ApparentWakeBoundaries(
        half_angle_rad=half_angle_rad,
        half_angle_deg=math.degrees(half_angle_rad),
        port_x_m=port_x_m,
        port_y_m=port_y_m,
        starboard_x_m=starboard_x_m,
        starboard_y_m=starboard_y_m,
    )
