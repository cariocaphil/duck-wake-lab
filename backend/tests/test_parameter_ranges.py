"""Tests for shared wake parameter range loading (UI bounds only)."""

from __future__ import annotations

import json
from pathlib import Path

from duck_wake_lab.parameter_ranges import load_parameter_ranges


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
    assert "duck_length_m" in ranges
    assert "swimming_speed_m_s" in ranges
    assert "speed_m_s" not in ranges
