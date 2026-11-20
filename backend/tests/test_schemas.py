"""Unit tests for WakeResponse API contract validation."""

from __future__ import annotations

import math

import pytest
from pydantic import ValidationError

from duck_wake_lab.schemas import WakeResponse


def _valid_kwargs() -> dict:
    return {
        "duck_length_m": 0.5,
        "speed_m_s": 1.2,
        "froude_number": 0.541,
        "half_angle_rad": math.asin(1.0 / 3.0),
        "half_angle_deg": math.degrees(math.asin(1.0 / 3.0)),
        "wake_length_m": 5.0,
        "port_x_m": [0.0, -2.5, -5.0],
        "port_y_m": [0.0, 0.88, 1.77],
        "starboard_x_m": [0.0, -2.5, -5.0],
        "starboard_y_m": [0.0, -0.88, -1.77],
    }


def test_wake_response_accepts_valid_contract() -> None:
    wake = WakeResponse(**_valid_kwargs())
    assert len(wake.port_x_m) == 3
    assert wake.port_x_m[0] == 0.0


def test_wake_response_rejects_mismatched_array_lengths() -> None:
    kwargs = _valid_kwargs()
    kwargs["starboard_y_m"] = [0.0, -0.88]
    with pytest.raises(ValidationError, match="same length"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_too_few_points() -> None:
    kwargs = _valid_kwargs()
    for key in ("port_x_m", "port_y_m", "starboard_x_m", "starboard_y_m"):
        kwargs[key] = [0.0]
    with pytest.raises(ValidationError, match="at least 2"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_non_origin_start() -> None:
    kwargs = _valid_kwargs()
    kwargs["port_x_m"] = [0.1, -2.5, -5.0]
    with pytest.raises(ValidationError, match="origin"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_non_finite_coordinate() -> None:
    kwargs = _valid_kwargs()
    kwargs["port_y_m"] = [0.0, float("nan"), 1.77]
    with pytest.raises(ValidationError, match="finite"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_non_finite_scalar() -> None:
    kwargs = _valid_kwargs()
    kwargs["froude_number"] = float("inf")
    with pytest.raises(ValidationError):
        WakeResponse(**kwargs)
