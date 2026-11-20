"""Tests for the POST /api/wake endpoint."""

from __future__ import annotations

import math

from fastapi.testclient import TestClient

from duck_wake_lab.main import app

client = TestClient(app)

VALID_BODY = {"duck_length_m": 0.5, "speed_m_s": 1.2}


def test_wake_returns_geometry() -> None:
    """Valid request returns wake geometry and physics metadata."""
    response = client.post("/api/wake", json=VALID_BODY)
    assert response.status_code == 200
    data = response.json()

    assert data["duck_length_m"] == 0.5
    assert data["speed_m_s"] == 1.2
    assert data["wake_length_m"] == 5.0
    assert isinstance(data["froude_number"], float)
    assert math.isfinite(data["froude_number"])
    assert data["froude_number"] > 0
    assert math.isclose(data["half_angle_deg"], math.degrees(math.asin(1.0 / 3.0)))

    n = len(data["port_x_m"])
    assert n >= 2
    assert len(data["port_y_m"]) == n
    assert len(data["starboard_x_m"]) == n
    assert len(data["starboard_y_m"]) == n


def test_wake_rejects_out_of_range_length() -> None:
    """Length outside 0.2–1.0 is rejected."""
    for length in (0.1, 1.1):
        response = client.post(
            "/api/wake",
            json={"duck_length_m": length, "speed_m_s": 1.0},
        )
        assert response.status_code == 422


def test_wake_rejects_out_of_range_speed() -> None:
    """Speed outside 0.1–3.0 is rejected."""
    for speed in (0.05, 3.5):
        response = client.post(
            "/api/wake",
            json={"duck_length_m": 0.5, "speed_m_s": speed},
        )
        assert response.status_code == 422


def test_wake_request_rejects_non_finite_values() -> None:
    """inf and nan are rejected via allow_inf_nan=False on WakeRequest.

    Asserted at the Pydantic layer because FastAPI's default 422 JSON
    response cannot serialize non-finite ``input`` values.
    """
    from pydantic import ValidationError

    from duck_wake_lab.schemas import WakeRequest

    cases = (
        {"duck_length_m": float("inf"), "speed_m_s": 1.0},
        {"duck_length_m": 0.5, "speed_m_s": float("nan")},
        {"duck_length_m": float("nan"), "speed_m_s": 1.0},
        {"duck_length_m": 0.5, "speed_m_s": float("inf")},
    )
    for payload in cases:
        try:
            WakeRequest.model_validate(payload)
            raise AssertionError(f"expected ValidationError for {payload}")
        except ValidationError as exc:
            assert any(err["type"] == "finite_number" for err in exc.errors())


def test_wake_coordinate_arrays_are_consistent() -> None:
    """Port/starboard arms start at the origin and extend behind the duck."""
    data = client.post("/api/wake", json=VALID_BODY).json()

    assert data["port_x_m"][0] == 0.0
    assert data["port_y_m"][0] == 0.0
    assert data["starboard_x_m"][0] == 0.0
    assert data["starboard_y_m"][0] == 0.0

    assert all(x <= 0.0 for x in data["port_x_m"])
    assert all(x <= 0.0 for x in data["starboard_x_m"])
    assert all(y >= 0.0 for y in data["port_y_m"])
    assert all(y <= 0.0 for y in data["starboard_y_m"])


def test_wake_geometry_independent_of_speed() -> None:
    """Identical length at different speeds: Froude differs; geometry does not."""
    slow = client.post(
        "/api/wake",
        json={"duck_length_m": 0.5, "speed_m_s": 0.5},
    ).json()
    fast = client.post(
        "/api/wake",
        json={"duck_length_m": 0.5, "speed_m_s": 2.0},
    ).json()

    assert slow["froude_number"] != fast["froude_number"]
    assert slow["half_angle_rad"] == fast["half_angle_rad"]
    assert slow["half_angle_deg"] == fast["half_angle_deg"]
    assert slow["port_x_m"] == fast["port_x_m"]
    assert slow["port_y_m"] == fast["port_y_m"]
    assert slow["starboard_x_m"] == fast["starboard_x_m"]
    assert slow["starboard_y_m"] == fast["starboard_y_m"]
