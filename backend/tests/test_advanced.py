"""Tests for the simplified Froude-dependent apparent wake model."""

import math

import numpy as np
import pytest

from duck_wake_lab.physics import (
    APPARENT_ANGLE_THRESHOLD_FROUDE,
    GRAVITY_M_S2,
    KELVIN_HALF_ANGLE_RAD,
    DuckParameters,
    PhysicsMode,
    apparent_wake_boundaries,
    apparent_wake_half_angle_rad,
    froude_number,
    kelvin_wake_boundaries,
)


def test_physics_mode_values() -> None:
    assert PhysicsMode("kelvin") is PhysicsMode.KELVIN
    assert PhysicsMode("advanced") is PhysicsMode.ADVANCED
    with pytest.raises(ValueError):
        PhysicsMode("turbulent")


def test_threshold_froude_matches_formula() -> None:
    """atan(0.5 / Fr) equals the Kelvin angle exactly at the threshold."""
    assert APPARENT_ANGLE_THRESHOLD_FROUDE == pytest.approx(1.4142135, abs=1e-6)
    assert math.atan(0.5 / APPARENT_ANGLE_THRESHOLD_FROUDE) == pytest.approx(
        KELVIN_HALF_ANGLE_RAD
    )


def test_kelvin_half_angle_constant_across_speeds() -> None:
    """The Kelvin envelope never depends on speed or Froude number."""
    angles = set()
    for speed in (0.0, 0.5, 1.2, 3.0, 10.0):
        params = DuckParameters(body_length_m=0.4, speed_m_s=speed)
        froude_number(params)
        angles.add(kelvin_wake_boundaries(wake_length_m=4.0).half_angle_rad)
    assert angles == {KELVIN_HALF_ANGLE_RAD}


def test_low_froude_capped_at_kelvin_angle() -> None:
    for fr in (0.0, 1e-12, 0.1, 0.5, 1.0, 1.4):
        assert apparent_wake_half_angle_rad(fr) == KELVIN_HALF_ANGLE_RAD


def test_apparent_never_exceeds_kelvin() -> None:
    for fr in np.linspace(0.0, 50.0, 501):
        assert apparent_wake_half_angle_rad(float(fr)) <= KELVIN_HALF_ANGLE_RAD


def test_high_froude_decreases_with_speed() -> None:
    frs = [1.5, 2.0, 3.0, 5.0, 10.0, 100.0]
    angles = [apparent_wake_half_angle_rad(fr) for fr in frs]
    assert angles[0] < KELVIN_HALF_ANGLE_RAD
    assert all(a > b for a, b in zip(angles, angles[1:], strict=False))
    assert angles[-1] == pytest.approx(math.atan(0.5 / 100.0))


def test_decreases_with_speed_for_fixed_length() -> None:
    """Using the real Froude definition: faster duck, narrower apparent wake."""
    length = 0.2
    slow = froude_number(DuckParameters(length, 2.2))
    fast = froude_number(DuckParameters(length, 3.0))
    assert slow == pytest.approx(2.2 / math.sqrt(GRAVITY_M_S2 * length))
    assert apparent_wake_half_angle_rad(fast) < apparent_wake_half_angle_rad(slow)
    assert apparent_wake_half_angle_rad(slow) < KELVIN_HALF_ANGLE_RAD


def test_extremely_small_and_large_values_are_finite() -> None:
    for fr in (5e-324, 1e-300, 1e300, 1.7e308):
        angle = apparent_wake_half_angle_rad(fr)
        assert math.isfinite(angle)
        assert 0.0 < angle <= KELVIN_HALF_ANGLE_RAD


@pytest.mark.parametrize(
    "bad", [-0.1, -1.0, math.nan, math.inf, -math.inf, True, False, "1.0", None]
)
def test_invalid_froude_raises(bad: object) -> None:
    with pytest.raises(ValueError, match="froude"):
        apparent_wake_half_angle_rad(bad)  # type: ignore[arg-type]


def test_apparent_boundaries_geometry() -> None:
    theta = math.radians(10.0)
    wake = apparent_wake_boundaries(theta, wake_length_m=5.0, n_points=11)
    assert wake.half_angle_rad == theta
    assert wake.half_angle_deg == pytest.approx(10.0)
    assert wake.port_x_m[0] == 0.0 and wake.port_y_m[0] == 0.0
    assert wake.port_x_m[-1] == pytest.approx(-5.0)
    assert wake.port_y_m[-1] == pytest.approx(5.0 * math.tan(theta))
    np.testing.assert_allclose(wake.starboard_y_m, -wake.port_y_m)
    assert wake.port_x_m is not wake.starboard_x_m
    assert np.all(np.isfinite(wake.port_y_m))


def test_apparent_at_kelvin_angle_matches_kelvin_boundaries() -> None:
    """At the cap, the apparent arms reproduce the Kelvin arms exactly."""
    kelvin = kelvin_wake_boundaries(wake_length_m=5.0, n_points=21)
    apparent = apparent_wake_boundaries(
        apparent_wake_half_angle_rad(0.3), wake_length_m=5.0, n_points=21
    )
    np.testing.assert_array_equal(apparent.port_x_m, kelvin.port_x_m)
    np.testing.assert_array_equal(apparent.port_y_m, kelvin.port_y_m)
    np.testing.assert_array_equal(apparent.starboard_y_m, kelvin.starboard_y_m)


@pytest.mark.parametrize("angle", [0.0, -0.1, math.pi / 2, math.nan, math.inf])
def test_invalid_half_angle_raises(angle: float) -> None:
    with pytest.raises(ValueError, match="half_angle_rad"):
        apparent_wake_boundaries(angle, wake_length_m=1.0)


def test_invalid_boundary_inputs_raise() -> None:
    with pytest.raises(ValueError, match="wake_length_m"):
        apparent_wake_boundaries(0.2, wake_length_m=0.0)
    with pytest.raises(ValueError, match="wake_length_m"):
        apparent_wake_boundaries(0.2, wake_length_m=math.nan)
    with pytest.raises(ValueError, match="n_points"):
        apparent_wake_boundaries(0.2, wake_length_m=1.0, n_points=1)
    with pytest.raises(ValueError, match="n_points"):
        apparent_wake_boundaries(0.2, wake_length_m=1.0, n_points=True)
