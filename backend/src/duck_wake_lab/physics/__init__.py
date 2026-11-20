"""Physics models for duck wake simulation.

Provides Froude-number calculation and a simplified deep-water Kelvin wake
envelope. Advanced speed-dependent wave models will be added in later levels.
"""

from duck_wake_lab.physics.froude import GRAVITY_M_S2, froude_number
from duck_wake_lab.physics.kelvin import (
    KELVIN_HALF_ANGLE_DEG,
    KELVIN_HALF_ANGLE_RAD,
    KelvinWakeBoundaries,
    kelvin_wake_boundaries,
)
from duck_wake_lab.physics.parameters import DuckParameters

__all__ = [
    "DuckParameters",
    "GRAVITY_M_S2",
    "KELVIN_HALF_ANGLE_DEG",
    "KELVIN_HALF_ANGLE_RAD",
    "KelvinWakeBoundaries",
    "froude_number",
    "kelvin_wake_boundaries",
]
