"""Froude number calculation for duck swimming."""

from __future__ import annotations

import math

from duck_wake_lab.physics.parameters import DuckParameters

GRAVITY_M_S2 = 9.81


def froude_number(params: DuckParameters) -> float:
    """Return the dimensionless Froude number Fr = v / sqrt(g L).

    Args:
        params: Validated duck body length and swimming speed.

    Returns:
        Froude number (0.0 when speed is zero).
    """
    return params.speed_m_s / math.sqrt(GRAVITY_M_S2 * params.body_length_m)
