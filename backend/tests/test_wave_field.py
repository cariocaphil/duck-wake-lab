"""Tests for the POST /api/wave-field endpoint."""

from __future__ import annotations

import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from duck_wake_lab.main import app
from duck_wake_lab.schemas import WaveFieldResponse

client = TestClient(app)

URL = "/api/wave-field"
VALID_BODY = {"duck_length_m": 0.55, "swimming_speed_m_s": 1.2}


def _get(body: dict | None = None) -> dict:
    response = client.post(URL, json=body or VALID_BODY)
    assert response.status_code == 200
    return response.json()


def test_returns_grid_and_parameters() -> None:
    data = _get()
    nx, ny = data["nx"], data["ny"]
    assert len(data["x_m"]) == nx
    assert len(data["y_m"]) == ny
    for key in ("transverse", "divergent", "combined"):
        grid = data[key]
        assert len(grid) == ny
        assert all(len(row) == nx for row in grid)

    assert data["duck_length_m"] == 0.55
    assert data["swimming_speed_m_s"] == 1.2
    assert data["wake_length_m"] == pytest.approx(5.5)
    assert data["x_m"][0] == pytest.approx(-data["wake_length_m"])
    assert data["x_m"][-1] == 0.0
    assert data["froude_number"] == pytest.approx(1.2 / math.sqrt(9.81 * 0.55))
    assert data["kelvin_angle_deg"] == pytest.approx(
        math.degrees(math.asin(1.0 / 3.0))
    )
    assert data["transverse_wavelength_m"] == pytest.approx(
        0.55 * (1 + 2 * data["froude_number"])
    )
    assert data["divergent_wavelength_m"] == pytest.approx(
        0.5 * data["transverse_wavelength_m"]
    )


def test_payload_size_is_bounded() -> None:
    data = _get()
    assert data["nx"] * data["ny"] <= 10_000
    assert len(client.post(URL, json=VALID_BODY).content) < 400_000


def test_all_values_finite() -> None:
    data = _get()
    for key in ("transverse", "divergent", "combined"):
        assert np.all(np.isfinite(np.array(data[key])))


def test_combined_equals_sum_of_rounded_components() -> None:
    data = _get()
    transverse = np.array(data["transverse"])
    divergent = np.array(data["divergent"])
    combined = np.array(data["combined"])
    np.testing.assert_allclose(combined, transverse + divergent, rtol=0, atol=1e-9)


def test_left_right_symmetry() -> None:
    data = _get()
    y = np.array(data["y_m"])
    np.testing.assert_allclose(y, -y[::-1], atol=1e-9)
    for key in ("transverse", "divergent", "combined"):
        grid = np.array(data[key])
        np.testing.assert_allclose(grid, grid[::-1], atol=1e-9)


def test_field_is_zero_ahead_of_and_nonzero_behind_duck() -> None:
    combined = np.array(_get()["combined"])
    assert not combined[:, -1].any()
    assert np.abs(combined).max() > 0.1


def test_speed_changes_pattern() -> None:
    slow = _get({**VALID_BODY, "swimming_speed_m_s": 0.6})
    fast = _get({**VALID_BODY, "swimming_speed_m_s": 1.8})
    assert fast["transverse_wavelength_m"] > slow["transverse_wavelength_m"]
    for key in ("transverse", "divergent", "combined"):
        assert slow[key] != fast[key]


def test_repeated_requests_are_identical() -> None:
    first = client.post(URL, json=VALID_BODY)
    second = client.post(URL, json=VALID_BODY)
    assert first.content == second.content


def test_zero_speed_returns_flat_field() -> None:
    data = _get({**VALID_BODY, "swimming_speed_m_s": 0.0})
    for key in ("transverse", "divergent", "combined"):
        assert not np.array(data[key]).any()


def test_response_validates_against_schema() -> None:
    data = _get()
    WaveFieldResponse.model_validate(data)
    assert set(data) == set(WaveFieldResponse.model_fields)


@pytest.mark.parametrize(
    "body",
    [
        {"duck_length_m": 0.0, "swimming_speed_m_s": 1.0},
        {"duck_length_m": -0.5, "swimming_speed_m_s": 1.0},
        {"duck_length_m": 0.5, "swimming_speed_m_s": -0.1},
        {"duck_length_m": "abc", "swimming_speed_m_s": 1.0},
        {"duck_length_m": 0.5},
        {"swimming_speed_m_s": 1.0},
        {},
        {**VALID_BODY, "physics_mode": "kelvin"},
        {**VALID_BODY, "extra": 1},
    ],
)
def test_invalid_requests_rejected(body: dict) -> None:
    assert client.post(URL, json=body).status_code == 422


def test_wave_field_request_rejects_non_finite_values() -> None:
    """inf/nan are rejected by the request model.

    Asserted at the Pydantic layer (like ``/api/wake``) because FastAPI's
    default 422 JSON response cannot serialize non-finite ``input`` values.
    """
    from pydantic import ValidationError

    from duck_wake_lab.schemas import WaveFieldRequest

    for bad in (math.nan, math.inf, -math.inf):
        for payload in (
            {"duck_length_m": bad, "swimming_speed_m_s": 1.0},
            {"duck_length_m": 0.5, "swimming_speed_m_s": bad},
        ):
            with pytest.raises(ValidationError):
                WaveFieldRequest.model_validate(payload)


def test_existing_wake_endpoint_unchanged() -> None:
    data = client.post("/api/wake", json=VALID_BODY).json()
    assert data["physics_mode"] == "kelvin"
    assert "transverse" not in data
