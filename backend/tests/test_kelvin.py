"""Tests for the simplified Kelvin wake envelope model."""

import math

import numpy as np
import pytest

from duck_wake_lab.physics import (
    KELVIN_HALF_ANGLE_DEG,
    KELVIN_HALF_ANGLE_RAD,
    kelvin_wake_boundaries,
)


def test_kelvin_half_angle_approximately_19_47_degrees() -> None:
    """Theoretical Kelvin half-angle is arcsin(1/3) ≈ 19.47°."""
    assert KELVIN_HALF_ANGLE_RAD == pytest.approx(math.asin(1.0 / 3.0))
    assert KELVIN_HALF_ANGLE_DEG == pytest.approx(19.471220634, abs=1e-6)


def test_wake_boundary_symmetry() -> None:
    """Port and starboard y-coordinates are mirror images."""
    wake = kelvin_wake_boundaries(wake_length_m=5.0, n_points=21)
    np.testing.assert_allclose(wake.port_y_m, -wake.starboard_y_m)
    np.testing.assert_allclose(wake.port_x_m, wake.starboard_x_m)


def test_port_and_starboard_x_arrays_are_independent() -> None:
    """Port and starboard x-arrays must not alias the same buffer."""
    wake = kelvin_wake_boundaries(wake_length_m=5.0, n_points=11)
    assert wake.port_x_m is not wake.starboard_x_m

    original_starboard = wake.starboard_x_m.copy()
    wake.port_x_m[0] = -999.0
    np.testing.assert_array_equal(wake.starboard_x_m, original_starboard)


def test_wake_coordinates_extend_behind_duck() -> None:
    """All wake samples lie on or behind the duck (x <= 0)."""
    wake = kelvin_wake_boundaries(wake_length_m=3.0, n_points=11)
    assert np.all(wake.port_x_m <= 0.0)
    assert np.all(wake.starboard_x_m <= 0.0)
    assert wake.port_x_m[-1] == pytest.approx(-3.0)
    assert wake.starboard_x_m[-1] == pytest.approx(-3.0)


def test_coordinate_array_shapes() -> None:
    """All four coordinate arrays have shape (n_points,)."""
    n_points = 17
    wake = kelvin_wake_boundaries(wake_length_m=4.0, n_points=n_points)
    expected = (n_points,)
    assert wake.port_x_m.shape == expected
    assert wake.port_y_m.shape == expected
    assert wake.starboard_x_m.shape == expected
    assert wake.starboard_y_m.shape == expected


def test_geometry_endpoints() -> None:
    """First sample is the origin; final |y| equals L * tan(θ)."""
    wake_length_m = 6.0
    wake = kelvin_wake_boundaries(wake_length_m=wake_length_m, n_points=25)
    tan_theta = math.tan(KELVIN_HALF_ANGLE_RAD)

    assert wake.port_x_m[0] == pytest.approx(0.0)
    assert wake.port_y_m[0] == pytest.approx(0.0)
    assert wake.starboard_x_m[0] == pytest.approx(0.0)
    assert wake.starboard_y_m[0] == pytest.approx(0.0)

    assert wake.port_x_m[-1] == pytest.approx(-wake_length_m)
    assert wake.starboard_x_m[-1] == pytest.approx(-wake_length_m)
    assert wake.port_y_m[-1] == pytest.approx(wake_length_m * tan_theta)
    assert wake.starboard_y_m[-1] == pytest.approx(-wake_length_m * tan_theta)


def test_invalid_wake_length_raises() -> None:
    """Zero, negative, and non-finite wake lengths raise ValueError."""
    with pytest.raises(ValueError, match="wake_length_m"):
        kelvin_wake_boundaries(wake_length_m=0.0)
    with pytest.raises(ValueError, match="wake_length_m"):
        kelvin_wake_boundaries(wake_length_m=-1.0)
    with pytest.raises(ValueError, match="wake_length_m"):
        kelvin_wake_boundaries(wake_length_m=math.nan)
    with pytest.raises(ValueError, match="wake_length_m"):
        kelvin_wake_boundaries(wake_length_m=math.inf)


def test_invalid_n_points_raises() -> None:
    """n_points below 2, floats, and bools raise ValueError."""
    with pytest.raises(ValueError, match="n_points"):
        kelvin_wake_boundaries(wake_length_m=1.0, n_points=1)
    with pytest.raises(ValueError, match="n_points"):
        kelvin_wake_boundaries(wake_length_m=1.0, n_points=0)
    with pytest.raises(ValueError, match="n_points"):
        kelvin_wake_boundaries(wake_length_m=1.0, n_points=True)
    with pytest.raises(ValueError, match="n_points"):
        kelvin_wake_boundaries(wake_length_m=1.0, n_points=3.0)  # type: ignore[arg-type]
