"""Tests for Froude number calculation."""

import math

import pytest

from duck_wake_lab.physics import GRAVITY_M_S2, DuckParameters, froude_number


def test_froude_number_known_value() -> None:
    """Fr equals 1 when v = sqrt(g L) with L = 1 m."""
    params = DuckParameters(body_length_m=1.0, speed_m_s=math.sqrt(GRAVITY_M_S2))
    assert froude_number(params) == pytest.approx(1.0)


def test_zero_speed_produces_zero_froude() -> None:
    """Zero swimming speed yields Froude number zero."""
    params = DuckParameters(body_length_m=0.4, speed_m_s=0.0)
    assert froude_number(params) == 0.0
