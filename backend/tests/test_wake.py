"""Tests for the POST /api/wake endpoint."""

from __future__ import annotations

import json
import math

from fastapi.testclient import TestClient

from duck_wake_lab.main import app

client = TestClient(app)

VALID_BODY = {"duck_length_m": 0.5, "swimming_speed_m_s": 1.2}


def test_wake_returns_geometry() -> None:
    """Valid request returns wake geometry and physics metadata."""
    response = client.post("/api/wake", json=VALID_BODY)
    assert response.status_code == 200
    data = response.json()

    assert data["wake_length_m"] == 5.0
    assert isinstance(data["froude_number"], float)
    assert math.isfinite(data["froude_number"])
    assert data["froude_number"] > 0
    assert math.isclose(
        data["kelvin_angle_deg"],
        math.degrees(math.asin(1.0 / 3.0)),
    )

    n = len(data["port_boundary"])
    assert n >= 2
    assert len(data["starboard_boundary"]) == n
    for point in data["port_boundary"] + data["starboard_boundary"]:
        assert isinstance(point["x_m"], (int, float))
        assert isinstance(point["y_m"], (int, float))
        assert math.isfinite(point["x_m"])
        assert math.isfinite(point["y_m"])


def test_wake_accepts_zero_swimming_speed() -> None:
    """Zero swimming speed is valid under the API contract."""
    response = client.post(
        "/api/wake",
        json={"duck_length_m": 0.5, "swimming_speed_m_s": 0.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["froude_number"] == 0.0


def test_wake_rejects_non_positive_duck_length() -> None:
    """Zero or negative duck length is rejected."""
    for length in (0.0, -0.1):
        response = client.post(
            "/api/wake",
            json={"duck_length_m": length, "swimming_speed_m_s": 1.0},
        )
        assert response.status_code == 422


def test_wake_rejects_negative_swimming_speed() -> None:
    """Negative swimming speed is rejected."""
    response = client.post(
        "/api/wake",
        json={"duck_length_m": 0.5, "swimming_speed_m_s": -0.1},
    )
    assert response.status_code == 422


def test_wake_response_is_json_serializable() -> None:
    """Response body is plain JSON (no NumPy types)."""
    data = client.post("/api/wake", json=VALID_BODY).json()
    # Round-trip through json ensures native Python scalars/lists only.
    encoded = json.dumps(data)
    assert isinstance(encoded, str)
    assert json.loads(encoded) == data


def test_wake_request_rejects_non_finite_values() -> None:
    """inf and nan are rejected via allow_inf_nan=False on WakeRequest.

    Asserted at the Pydantic layer because FastAPI's default 422 JSON
    response cannot serialize non-finite ``input`` values.
    """
    from pydantic import ValidationError

    from duck_wake_lab.schemas import WakeRequest

    cases = (
        {"duck_length_m": float("inf"), "swimming_speed_m_s": 1.0},
        {"duck_length_m": 0.5, "swimming_speed_m_s": float("nan")},
        {"duck_length_m": float("nan"), "swimming_speed_m_s": 1.0},
        {"duck_length_m": 0.5, "swimming_speed_m_s": float("inf")},
    )
    for payload in cases:
        try:
            WakeRequest.model_validate(payload)
            raise AssertionError(f"expected ValidationError for {payload}")
        except ValidationError as exc:
            assert any(err["type"] == "finite_number" for err in exc.errors())


def test_wake_boundaries_are_consistent() -> None:
    """Port/starboard arms start at the origin and extend behind the duck."""
    data = client.post("/api/wake", json=VALID_BODY).json()

    assert data["port_boundary"][0] == {"x_m": 0.0, "y_m": 0.0}
    assert data["starboard_boundary"][0] == {"x_m": 0.0, "y_m": 0.0}

    assert all(point["x_m"] <= 0.0 for point in data["port_boundary"])
    assert all(point["x_m"] <= 0.0 for point in data["starboard_boundary"])
    assert all(point["y_m"] >= 0.0 for point in data["port_boundary"])
    assert all(point["y_m"] <= 0.0 for point in data["starboard_boundary"])


def test_wake_geometry_independent_of_speed() -> None:
    """Identical length at different speeds: Froude differs; geometry does not."""
    slow = client.post(
        "/api/wake",
        json={"duck_length_m": 0.5, "swimming_speed_m_s": 0.5},
    ).json()
    fast = client.post(
        "/api/wake",
        json={"duck_length_m": 0.5, "swimming_speed_m_s": 2.0},
    ).json()

    assert slow["froude_number"] != fast["froude_number"]
    assert slow["kelvin_angle_deg"] == fast["kelvin_angle_deg"]
    assert slow["port_boundary"] == fast["port_boundary"]
    assert slow["starboard_boundary"] == fast["starboard_boundary"]
