"""Physics models for duck wake simulation.

Provides Froude-number calculation, a simplified deep-water Kelvin wake
envelope, a simplified Froude-dependent apparent wake angle, and an
illustrative transverse/divergent wave-interference field (educational
approximations).
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
from duck_wake_lab.physics.waves import (
    WAVE_GRID_NX,
    WAVE_GRID_NY,
    WaveField,
    divergent_wavelength_m,
    transverse_wavelength_m,
    wave_field,
)

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
    "WAVE_GRID_NX",
    "WAVE_GRID_NY",
    "WaveField",
    "apparent_wake_boundaries",
    "apparent_wake_half_angle_rad",
    "divergent_wavelength_m",
    "froude_number",
    "kelvin_wake_boundaries",
    "transverse_wavelength_m",
    "wave_field",
]
