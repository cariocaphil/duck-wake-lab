"""Tests for the illustrative wave-interference physics layer."""

from __future__ import annotations

import math

import numpy as np
import pytest

from duck_wake_lab.physics import (
    GRAVITY_M_S2,
    KELVIN_HALF_ANGLE_RAD,
    WAVE_GRID_NX,
    WAVE_GRID_NY,
    DuckParameters,
    divergent_wavelength_m,
    froude_number,
    transverse_wavelength_m,
    wave_field,
)

LENGTH = 0.55
SPEED = 1.2
WAKE_LENGTH = LENGTH * 10.0


def _field(length: float = LENGTH, speed: float = SPEED):
    return wave_field(DuckParameters(length, speed), length * 10.0)


def test_grid_dimensions_and_coordinates() -> None:
    field = _field()
    assert field.x_m.shape == (WAVE_GRID_NX,)
    assert field.y_m.shape == (WAVE_GRID_NY,)
    for grid in (field.transverse, field.divergent, field.combined):
        assert grid.shape == (WAVE_GRID_NY, WAVE_GRID_NX)
    # x spans the region behind the duck only.
    assert field.x_m[0] == pytest.approx(-WAKE_LENGTH)
    assert field.x_m[-1] == 0.0
    assert np.all(np.diff(field.x_m) > 0)
    assert np.all(np.diff(field.y_m) > 0)
    # y is symmetric and contains the swimming axis.
    assert np.array_equal(field.y_m, -field.y_m[::-1])
    assert field.y_m[WAVE_GRID_NY // 2] == 0.0
    # The grid is wider than the Kelvin cone at the far end.
    assert field.y_m[-1] > WAKE_LENGTH * math.tan(KELVIN_HALF_ANGLE_RAD)


def test_values_are_finite() -> None:
    for speed in (0.0, 0.1, 1.2, 3.0, 50.0):
        field = _field(speed=speed)
        for grid in (field.transverse, field.divergent, field.combined):
            assert np.all(np.isfinite(grid))


def test_combined_is_sum_of_families() -> None:
    field = _field()
    np.testing.assert_allclose(
        field.combined, field.transverse + field.divergent, rtol=0, atol=1e-12
    )


@pytest.mark.parametrize("speed", [0.3, 1.2, 3.0])
def test_left_right_symmetry(speed: float) -> None:
    field = _field(speed=speed)
    for grid in (field.transverse, field.divergent, field.combined):
        np.testing.assert_allclose(grid, grid[::-1, :], rtol=0, atol=1e-12)


def test_nothing_ahead_of_duck_and_energy_in_wake_region() -> None:
    field = _field()
    # Turn-on is smooth and exactly zero at the duck's own x position.
    assert np.all(field.combined[:, -1] == 0.0)

    xx, yy = np.meshgrid(field.x_m, field.y_m)
    outside = np.abs(yy) > np.tan(KELVIN_HALF_ANGLE_RAD) * (-xx)
    energy = field.combined**2
    assert energy[outside].sum() / energy.sum() < 0.15


def test_speed_changes_wavelength_and_pattern() -> None:
    slow = _field(speed=0.6)
    fast = _field(speed=1.8)
    assert fast.transverse_wavelength_m > slow.transverse_wavelength_m
    assert fast.divergent_wavelength_m > slow.divergent_wavelength_m
    assert not np.allclose(slow.transverse, fast.transverse, atol=1e-3)
    assert not np.allclose(slow.divergent, fast.divergent, atol=1e-3)
    assert not np.allclose(slow.combined, fast.combined, atol=1e-3)


def test_wavelength_rule_is_documented_formula() -> None:
    params = DuckParameters(LENGTH, SPEED)
    fr = froude_number(params)
    assert fr == pytest.approx(SPEED / math.sqrt(GRAVITY_M_S2 * LENGTH))
    assert transverse_wavelength_m(params) == pytest.approx(LENGTH * (1 + 2 * fr))
    assert divergent_wavelength_m(params) == pytest.approx(
        0.5 * transverse_wavelength_m(params)
    )


def test_deterministic_across_calls() -> None:
    a = _field()
    b = _field()
    assert np.array_equal(a.transverse, b.transverse)
    assert np.array_equal(a.divergent, b.divergent)
    assert np.array_equal(a.combined, b.combined)


def test_zero_speed_has_no_wake() -> None:
    field = _field(speed=0.0)
    assert not field.transverse.any()
    assert not field.divergent.any()
    assert not field.combined.any()


def test_pattern_depends_only_on_froude_number_in_duck_lengths() -> None:
    """Geometry is duck-length-relative: equal Fr gives the same pattern."""
    small = DuckParameters(0.35, 0.8)
    scale = 2.0
    large = DuckParameters(0.35 * scale, 0.8 * math.sqrt(scale))
    assert froude_number(small) == pytest.approx(froude_number(large))

    a = wave_field(small, small.body_length_m * 10.0)
    b = wave_field(large, large.body_length_m * 10.0)
    np.testing.assert_allclose(a.combined, b.combined, rtol=0, atol=1e-9)
    np.testing.assert_allclose(b.x_m, a.x_m * scale)


def test_transverse_and_divergent_are_distinguishable() -> None:
    field = _field()
    assert not np.allclose(field.transverse, field.divergent, atol=1e-3)
    # Constructive and destructive interference both occur.
    t, d = field.transverse, field.divergent
    assert np.any((t * d > 0) & (np.abs(t * d) > 1e-3))
    assert np.any((t * d < 0) & (np.abs(t * d) > 1e-3))


@pytest.mark.parametrize("bad", [0.0, -1.0, math.nan, math.inf])
def test_invalid_wake_length_rejected(bad: float) -> None:
    with pytest.raises(ValueError, match="wake_length_m"):
        wave_field(DuckParameters(LENGTH, SPEED), bad)


@pytest.mark.parametrize("nx", [1, 0, 2.5, True])
def test_invalid_nx_rejected(nx) -> None:
    with pytest.raises(ValueError, match="nx"):
        wave_field(DuckParameters(LENGTH, SPEED), 1.0, nx=nx)


@pytest.mark.parametrize("ny", [1, 2, 4, 3.0, True])
def test_invalid_ny_rejected(ny) -> None:
    with pytest.raises(ValueError, match="ny"):
        wave_field(DuckParameters(LENGTH, SPEED), 1.0, ny=ny)
