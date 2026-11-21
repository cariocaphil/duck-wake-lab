"""Tests for the POST /api/wake endpoint."""

from __future__ import annotations

import json
import math

import pytest
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


# --- Physics mode (Kelvin vs advanced) -------------------------------------

KELVIN_DEG = math.degrees(math.asin(1.0 / 3.0))
# Teal-sized duck fast enough for Fr > sqrt(2): 0.35 m at 3.0 m/s -> Fr ≈ 1.62.
HIGH_FR_BODY = {"duck_length_m": 0.35, "swimming_speed_m_s": 3.0}


def test_wake_without_mode_matches_explicit_kelvin() -> None:
    """Omitting physics_mode preserves Kelvin behavior."""
    default = client.post("/api/wake", json=VALID_BODY).json()
    explicit = client.post(
        "/api/wake", json={**VALID_BODY, "physics_mode": "kelvin"}
    ).json()
    assert default == explicit
    assert default["physics_mode"] == "kelvin"
    assert default["apparent_angle_deg"] == default["kelvin_angle_deg"]
    assert default["apparent_port_boundary"] == default["port_boundary"]
    assert default["apparent_starboard_boundary"] == default["starboard_boundary"]


def test_wake_kelvin_mode_unchanged_by_speed() -> None:
    fast = client.post("/api/wake", json={**HIGH_FR_BODY}).json()
    assert fast["kelvin_angle_deg"] == pytest.approx(KELVIN_DEG)
    assert fast["apparent_angle_deg"] == pytest.approx(KELVIN_DEG)


def test_wake_advanced_returns_both_angles_and_arms() -> None:
    data = client.post(
        "/api/wake", json={**HIGH_FR_BODY, "physics_mode": "advanced"}
    ).json()
    kelvin = client.post("/api/wake", json=HIGH_FR_BODY).json()

    assert data["physics_mode"] == "advanced"
    assert data["froude_number"] > math.sqrt(2)
    assert data["kelvin_angle_deg"] == pytest.approx(KELVIN_DEG)
    expected = math.degrees(math.atan(0.5 / data["froude_number"]))
    assert data["apparent_angle_deg"] == pytest.approx(expected)
    assert data["apparent_angle_deg"] < data["kelvin_angle_deg"]

    # The Kelvin envelope is unchanged by the mode.
    assert data["port_boundary"] == kelvin["port_boundary"]
    assert data["starboard_boundary"] == kelvin["starboard_boundary"]

    n = len(data["port_boundary"])
    for key in ("apparent_port_boundary", "apparent_starboard_boundary"):
        assert len(data[key]) == n
        assert data[key][0] == {"x_m": 0.0, "y_m": 0.0}
    last_port = data["apparent_port_boundary"][-1]
    assert last_port["y_m"] == pytest.approx(
        -last_port["x_m"] * math.tan(math.radians(data["apparent_angle_deg"]))
    )
    # Apparent arms lie inside the envelope.
    assert data["apparent_port_boundary"][-1]["y_m"] < data["port_boundary"][-1]["y_m"]


def test_wake_advanced_low_froude_equals_kelvin() -> None:
    data = client.post(
        "/api/wake", json={**VALID_BODY, "physics_mode": "advanced"}
    ).json()
    assert data["froude_number"] < math.sqrt(2)
    assert data["apparent_angle_deg"] == pytest.approx(KELVIN_DEG)
    assert data["apparent_port_boundary"] == data["port_boundary"]


def test_wake_advanced_zero_speed() -> None:
    data = client.post(
        "/api/wake",
        json={
            "duck_length_m": 0.5,
            "swimming_speed_m_s": 0.0,
            "physics_mode": "advanced",
        },
    ).json()
    assert data["froude_number"] == 0.0
    assert data["apparent_angle_deg"] == pytest.approx(KELVIN_DEG)


def test_wake_apparent_angle_decreases_with_speed() -> None:
    angles = []
    for speed in (2.5, 3.0, 4.0, 8.0):
        body = {"duck_length_m": 0.35, "swimming_speed_m_s": speed}
        data = client.post(
            "/api/wake", json={**body, "physics_mode": "advanced"}
        ).json()
        angles.append(data["apparent_angle_deg"])
    assert all(a > b for a, b in zip(angles, angles[1:], strict=False))


def test_wake_rejects_invalid_physics_mode() -> None:
    for mode in ("turbulent", "Kelvin", "", None, 1):
        response = client.post("/api/wake", json={**VALID_BODY, "physics_mode": mode})
        assert response.status_code == 422


def test_wake_advanced_response_validates_against_schema() -> None:
    from duck_wake_lab.schemas import WakeResponse

    data = client.post(
        "/api/wake", json={**HIGH_FR_BODY, "physics_mode": "advanced"}
    ).json()
    WakeResponse.model_validate(data)
    assert set(data) == set(WakeResponse.model_fields)
