"""Tests for shared wake parameter range loading and WakeRequest bounds."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from duck_wake_lab.parameter_ranges import load_parameter_ranges
from duck_wake_lab.schemas import WakeRequest


def test_load_parameter_ranges_matches_shared_json() -> None:
    ranges = load_parameter_ranges()
    path = (
        Path(__file__).resolve().parents[2]
        / "shared"
        / "wake-parameter-ranges.json"
    )
    with path.open(encoding="utf-8") as handle:
        expected = json.load(handle)
    assert ranges == expected


def test_wake_request_rejects_just_outside_shared_bounds() -> None:
    ranges = load_parameter_ranges()
    length = ranges["duck_length_m"]
    speed = ranges["speed_m_s"]

    with pytest.raises(ValidationError):
        WakeRequest(
            duck_length_m=length["min"] - 0.01,
            speed_m_s=speed["min"],
        )
    with pytest.raises(ValidationError):
        WakeRequest(
            duck_length_m=length["max"] + 0.01,
            speed_m_s=speed["min"],
        )
    with pytest.raises(ValidationError):
        WakeRequest(
            duck_length_m=length["min"],
            speed_m_s=speed["min"] - 0.01,
        )
    with pytest.raises(ValidationError):
        WakeRequest(
            duck_length_m=length["min"],
            speed_m_s=speed["max"] + 0.01,
        )


def test_wake_request_accepts_shared_bounds() -> None:
    ranges = load_parameter_ranges()
    WakeRequest(
        duck_length_m=ranges["duck_length_m"]["min"],
        speed_m_s=ranges["speed_m_s"]["min"],
    )
    WakeRequest(
        duck_length_m=ranges["duck_length_m"]["max"],
        speed_m_s=ranges["speed_m_s"]["max"],
    )
