"""Unit tests for WakeResponse API contract validation."""

from __future__ import annotations

import math

import pytest
from pydantic import ValidationError

from duck_wake_lab.schemas import Point2D, WakeResponse


def _point(x: float, y: float) -> Point2D:
    return Point2D(x_m=x, y_m=y)


def _valid_kwargs() -> dict:
    return {
        "froude_number": 0.541,
        "kelvin_angle_deg": math.degrees(math.asin(1.0 / 3.0)),
        "wake_length_m": 5.0,
        "port_boundary": [
            _point(0.0, 0.0),
            _point(-2.5, 0.88),
            _point(-5.0, 1.77),
        ],
        "starboard_boundary": [
            _point(0.0, 0.0),
            _point(-2.5, -0.88),
            _point(-5.0, -1.77),
        ],
    }


def test_wake_response_accepts_valid_contract() -> None:
    wake = WakeResponse(**_valid_kwargs())
    assert len(wake.port_boundary) == 3
    assert wake.port_boundary[0].x_m == 0.0


def test_wake_response_rejects_mismatched_array_lengths() -> None:
    kwargs = _valid_kwargs()
    kwargs["starboard_boundary"] = [_point(0.0, 0.0), _point(-2.5, -0.88)]
    with pytest.raises(ValidationError, match="same length"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_too_few_points() -> None:
    kwargs = _valid_kwargs()
    kwargs["port_boundary"] = [_point(0.0, 0.0)]
    kwargs["starboard_boundary"] = [_point(0.0, 0.0)]
    with pytest.raises(ValidationError, match="at least 2"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_non_origin_start() -> None:
    kwargs = _valid_kwargs()
    kwargs["port_boundary"] = [
        _point(0.1, 0.0),
        _point(-2.5, 0.88),
        _point(-5.0, 1.77),
    ]
    with pytest.raises(ValidationError, match="origin"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_non_finite_coordinate() -> None:
    kwargs = _valid_kwargs()
    kwargs["port_boundary"] = [
        _point(0.0, 0.0),
        Point2D.model_construct(x_m=0.0, y_m=float("nan")),
        _point(-5.0, 1.77),
    ]
    with pytest.raises(ValidationError, match="finite"):
        WakeResponse(**kwargs)


def test_wake_response_rejects_non_finite_scalar() -> None:
    kwargs = _valid_kwargs()
    kwargs["froude_number"] = float("inf")
    with pytest.raises(ValidationError):
        WakeResponse(**kwargs)
