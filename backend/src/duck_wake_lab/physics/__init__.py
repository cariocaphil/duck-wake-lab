"""Physics models for duck wake simulation.

Provides Froude-number calculation, a simplified deep-water Kelvin wake
envelope, and a simplified Froude-dependent apparent wake angle
(educational approximation).
"""

from duck_wake_lab.physics.advanced import (
    APPARENT_ANGLE_COEFFICIENT,
    APPARENT_ANGLE_THRESHOLD_FROUDE,
    ApparentWakeBoundaries,
    apparent_wake_boundaries,
    apparent_wake_half_angle_rad,
)
from duck_wake_lab.physics.froude import GRAVITY_M_S2, froude_number
from duck_wake_lab.physics.kelvin import (
    KELVIN_HALF_ANGLE_DEG,
    KELVIN_HALF_ANGLE_RAD,
    KelvinWakeBoundaries,
    kelvin_wake_boundaries,
)
from duck_wake_lab.physics.mode import PhysicsMode
from duck_wake_lab.physics.parameters import DuckParameters

__all__ = [
    "APPARENT_ANGLE_COEFFICIENT",
    "APPARENT_ANGLE_THRESHOLD_FROUDE",
    "ApparentWakeBoundaries",
    "DuckParameters",
    "GRAVITY_M_S2",
    "KELVIN_HALF_ANGLE_DEG",
    "KELVIN_HALF_ANGLE_RAD",
    "KelvinWakeBoundaries",
    "PhysicsMode",
    "apparent_wake_boundaries",
    "apparent_wake_half_angle_rad",
    "froude_number",
    "kelvin_wake_boundaries",
]
