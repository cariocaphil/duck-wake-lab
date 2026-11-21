"""Illustrative transverse/divergent wave-interference field (educational).

This module builds a deterministic two-dimensional water-surface displacement
field behind a swimming duck using the superposition principle::

    eta(x, y) = sum_i A_i(x, y) * cos(phase_i(x, y))

Two families are generated separately and then added::

    combined = transverse + divergent

Coordinates follow the rest of the physics layer: the duck sits at the origin
and swims toward +x, so the wake lies at ``x <= 0``. Below, ``s = -x >= 0`` is
the distance behind the duck and ``y`` is the lateral offset.

What is illustrative (NOT physically derived)
---------------------------------------------
This is a lightweight mathematical picture, **not** a fluid simulation and
**not** a solution of the Kelvin wake integral. In particular:

* **Wavelength rule.** ``lambda_t = L * (1 + 2 * Fr)`` with the existing
  length-based Froude number ``Fr = v / sqrt(g L)``. It grows monotonically
  with speed so the pattern responds visibly. Real deep-water transverse
  waves scale like ``2 * pi * v**2 / g``; that would be unresolvable at slow
  speeds and longer than the domain at fast ones, so it is deliberately
  compressed. The divergent wavelength is a fixed fraction of ``lambda_t``.
* **Curved phases.** Transverse crests use ``s + y**2 / (2 R)`` with
  ``R = TRANSVERSE_CURVATURE_RADIUS_FACTOR * L`` so they bow toward the duck
  at the edges. Divergent crests are a mirrored oblique plane wave at a fixed
  propagation angle ``psi`` (``asin(1/sqrt(3))`` ~ 35.3 deg, the angle at
  which the transverse and divergent systems meet in classical theory),
  giving chevron crests.
* **Envelopes.** A smooth ramp-in behind the duck, a smooth lateral window
  tied to the Kelvin half-angle, and a gentle ``1/sqrt(1 + s/L)`` decay keep
  the pattern behind the duck and inside the wake region.
* **Amplitudes.** ``TRANSVERSE_AMPLITUDE`` and ``DIVERGENT_AMPLITUDE`` are
  arbitrary dimensionless numbers. There is no amplitude calibration and no
  energy dissipation. Displacements carry no physical unit.

Because every length above is a multiple of the duck length ``L`` and
``lambda = L * f(Fr)``, the pattern expressed in duck lengths depends only on
the Froude number: species change the scale, not the look, at equal ``Fr``.

The model is deterministic (no random phases) and exactly mirror-symmetric
about the swimming axis: it depends on ``y`` only through ``y**2``.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from duck_wake_lab.physics.froude import froude_number
from duck_wake_lab.physics.kelvin import KELVIN_HALF_ANGLE_RAD
from duck_wake_lab.physics.parameters import DuckParameters

# Fixed grid size (bounded; not client-controllable). ``ny`` is odd so the
# grid contains the swimming axis y = 0 and is exactly mirror-symmetric.
WAVE_GRID_NX = 121
WAVE_GRID_NY = 49

# The grid is wider than the Kelvin cone at the far end by this factor.
WAVE_GRID_HALF_WIDTH_MARGIN = 1.1

# Illustrative wavelength rule: lambda_t = L * (1 + TRANSVERSE_FROUDE_GAIN * Fr).
TRANSVERSE_FROUDE_GAIN = 2.0
# Divergent waves are shorter than transverse waves by this fixed factor.
DIVERGENT_WAVELENGTH_RATIO = 0.5

# Transverse crest curvature radius, in duck lengths: R = FACTOR * L.
TRANSVERSE_CURVATURE_RADIUS_FACTOR = 8.0

# Propagation angle of divergent wave vectors from the swimming axis.
DIVERGENT_PROPAGATION_ANGLE_RAD = math.asin(1.0 / math.sqrt(3.0))

# Arbitrary, dimensionless amplitudes (no calibration).
TRANSVERSE_AMPLITUDE = 1.0
DIVERGENT_AMPLITUDE = 0.7

# Envelope parameters, all in duck lengths.
RAMP_IN_LENGTHS = 0.5  # smooth turn-on distance behind the duck
DECAY_LENGTHS = 1.0  # amplitude ~ 1 / sqrt(1 + s / (DECAY_LENGTHS * L))
LATERAL_BASE_HALF_WIDTH_LENGTHS = 0.5  # window half-width at the duck
TRANSVERSE_WINDOW_FRACTION = 0.7  # of the Kelvin cone half-width
DIVERGENT_WINDOW_FRACTION = 0.9
WINDOW_SHARPNESS = 4  # super-Gaussian exponent (even integer)
# Smoothing of |y| in the divergent phase to avoid a kink on the axis.
DIVERGENT_AXIS_SMOOTHING_LENGTHS = 0.25


@dataclass(frozen=True, slots=True)
class WaveField:
    """Gridded surface displacement for each wave family.

    ``transverse``, ``divergent`` and ``combined`` have shape
    ``(len(y_m), len(x_m))`` (row = y index, column = x index) in arbitrary
    dimensionless units. ``combined`` equals ``transverse + divergent``.
    NumPy arrays remain mutable in place; callers should copy to isolate.
    """

    x_m: np.ndarray
    y_m: np.ndarray
    transverse: np.ndarray
    divergent: np.ndarray
    combined: np.ndarray
    froude_number: float
    transverse_wavelength_m: float
    divergent_wavelength_m: float


def transverse_wavelength_m(params: DuckParameters) -> float:
    """Illustrative transverse wavelength ``L * (1 + 2 * Fr)`` in meters."""
    fr = froude_number(params)
    return params.body_length_m * (1.0 + TRANSVERSE_FROUDE_GAIN * fr)


def divergent_wavelength_m(params: DuckParameters) -> float:
    """Illustrative divergent wavelength (fixed fraction of transverse)."""
    return DIVERGENT_WAVELENGTH_RATIO * transverse_wavelength_m(params)


def _smoothstep(t: np.ndarray) -> np.ndarray:
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def wave_field(
    params: DuckParameters,
    wake_length_m: float,
    nx: int = WAVE_GRID_NX,
    ny: int = WAVE_GRID_NY,
) -> WaveField:
    """Generate transverse, divergent and combined displacement fields.

    Args:
        params: Validated duck body length and swimming speed.
        wake_length_m: Extent behind the duck (``x`` from ``-wake_length_m``
            to 0), in meters (> 0).
        nx: Grid points along x (integer >= 2).
        ny: Grid points along y (odd integer >= 3).

    Returns:
        A :class:`WaveField`. At zero speed there is no wake and all fields
        are exactly zero.

    Raises:
        ValueError: If ``wake_length_m`` is non-finite or <= 0, ``nx`` is not
            an int >= 2, or ``ny`` is not an odd int >= 3.
    """
    if not math.isfinite(wake_length_m) or wake_length_m <= 0:
        raise ValueError("wake_length_m must be a finite number greater than 0")
    if type(nx) is not int or nx < 2:
        raise ValueError("nx must be an integer >= 2")
    if type(ny) is not int or ny < 3 or ny % 2 == 0:
        raise ValueError("ny must be an odd integer >= 3")

    length = params.body_length_m
    fr = froude_number(params)
    lambda_t_m = transverse_wavelength_m(params)
    lambda_d_m = divergent_wavelength_m(params)

    half_width_m = (
        WAVE_GRID_HALF_WIDTH_MARGIN * wake_length_m * math.tan(KELVIN_HALF_ANGLE_RAD)
    )
    x_m = np.linspace(-wake_length_m, 0.0, nx)
    y_m = np.linspace(-half_width_m, half_width_m, ny)
    # Enforce exact antisymmetry of the y-axis (linspace can differ by an ulp).
    y_m = 0.5 * (y_m - y_m[::-1])

    if params.speed_m_s == 0.0:
        zeros = np.zeros((ny, nx))
        return WaveField(
            x_m=x_m,
            y_m=y_m,
            transverse=zeros,
            divergent=zeros.copy(),
            combined=zeros.copy(),
            froude_number=fr,
            transverse_wavelength_m=lambda_t_m,
            divergent_wavelength_m=lambda_d_m,
        )

    # Normalized coordinates in duck lengths; the pattern depends only on Fr.
    s, y = np.meshgrid(-x_m / length, y_m / length)  # shape (ny, nx)
    wl_t = lambda_t_m / length
    wl_d = lambda_d_m / length
    tan_k = math.tan(KELVIN_HALF_ANGLE_RAD)

    ramp = _smoothstep(s / RAMP_IN_LENGTHS)
    decay = 1.0 / np.sqrt(1.0 + s / DECAY_LENGTHS)
    cone = LATERAL_BASE_HALF_WIDTH_LENGTHS + tan_k * s

    def window(fraction: float) -> np.ndarray:
        return np.exp(-((y / (fraction * cone)) ** WINDOW_SHARPNESS))

    # Transverse: curved crests, phase = k_t * (s + y^2 / (2R)).
    radius = TRANSVERSE_CURVATURE_RADIUS_FACTOR
    phase_t = 2.0 * math.pi / wl_t * (s + y**2 / (2.0 * radius))
    transverse = (
        TRANSVERSE_AMPLITUDE
        * ramp
        * decay
        * window(TRANSVERSE_WINDOW_FRACTION)
        * np.cos(phase_t)
    )

    # Divergent: mirrored oblique wave, phase = k_d * (s cos(psi) + |y| sin(psi)).
    psi = DIVERGENT_PROPAGATION_ANGLE_RAD
    abs_y = np.sqrt(y**2 + DIVERGENT_AXIS_SMOOTHING_LENGTHS**2)
    phase_d = (
        2.0 * math.pi / wl_d * (s * math.cos(psi) + abs_y * math.sin(psi))
    )
    divergent = (
        DIVERGENT_AMPLITUDE
        * ramp
        * decay
        * window(DIVERGENT_WINDOW_FRACTION)
        * np.cos(phase_d)
    )

    return WaveField(
        x_m=x_m,
        y_m=y_m,
        transverse=transverse,
        divergent=divergent,
        combined=transverse + divergent,
        froude_number=fr,
        transverse_wavelength_m=lambda_t_m,
        divergent_wavelength_m=lambda_d_m,
    )
