"""Tests for DuckParameters validation."""

import math

import pytest

from duck_wake_lab.physics import DuckParameters


def test_valid_parameters() -> None:
    """Finite positive length and non-negative speed are accepted."""
    params = DuckParameters(body_length_m=0.4, speed_m_s=0.5)
    assert params.body_length_m == 0.4
    assert params.speed_m_s == 0.5


def test_zero_speed_is_allowed() -> None:
    """Zero swimming speed is a valid resting state."""
    params = DuckParameters(body_length_m=0.4, speed_m_s=0.0)
    assert params.speed_m_s == 0.0


def test_invalid_body_length_raises() -> None:
    """Non-positive body length raises ValueError."""
    with pytest.raises(ValueError, match="body_length_m"):
        DuckParameters(body_length_m=0.0, speed_m_s=0.5)
    with pytest.raises(ValueError, match="body_length_m"):
        DuckParameters(body_length_m=-1.0, speed_m_s=0.5)


def test_negative_speed_raises() -> None:
    """Negative swimming speed raises ValueError."""
    with pytest.raises(ValueError, match="speed_m_s"):
        DuckParameters(body_length_m=0.4, speed_m_s=-0.1)


def test_non_finite_body_length_raises() -> None:
    """NaN and infinite body length raise ValueError."""
    with pytest.raises(ValueError, match="body_length_m"):
        DuckParameters(body_length_m=math.nan, speed_m_s=0.5)
    with pytest.raises(ValueError, match="body_length_m"):
        DuckParameters(body_length_m=math.inf, speed_m_s=0.5)


def test_non_finite_speed_raises() -> None:
    """NaN and infinite speed raise ValueError."""
    with pytest.raises(ValueError, match="speed_m_s"):
        DuckParameters(body_length_m=0.4, speed_m_s=math.nan)
    with pytest.raises(ValueError, match="speed_m_s"):
        DuckParameters(body_length_m=0.4, speed_m_s=math.inf)
