"""Orchestrate the illustrative wave-field physics for the API."""

from __future__ import annotations

import numpy as np

from duck_wake_lab.physics import (
    KELVIN_HALF_ANGLE_DEG,
    DuckParameters,
    wave_field,
)
from duck_wake_lab.schemas import WaveFieldRequest, WaveFieldResponse
from duck_wake_lab.wake_service import WAKE_LENGTH_FACTOR

# Payload-size quantization (API layer only; physics keeps full precision).
DISPLACEMENT_DECIMALS = 4
COORDINATE_DECIMALS = 6


def _quantize(values: np.ndarray, decimals: int) -> np.ndarray:
    # ``+ 0.0`` turns -0.0 into 0.0 so JSON output has no negative zeros.
    return np.round(values, decimals) + 0.0


def compute_wave_field(request: WaveFieldRequest) -> WaveFieldResponse:
    """Compute the transverse, divergent and combined displacement grids.

    ``transverse`` and ``divergent`` are rounded for payload size first, and
    ``combined`` is then built from those already-rounded arrays. Rounding the
    components and the sum independently would not satisfy
    ``combined == transverse + divergent``; this way it holds to float
    tolerance (~1e-9) in the response.
    """
    # API/UI: duck_length_m → physics: body_length_m (sole mapping bridge).
    params = DuckParameters(
        body_length_m=request.duck_length_m,
        speed_m_s=request.swimming_speed_m_s,
    )
    wake_length_m = request.duck_length_m * WAKE_LENGTH_FACTOR
    field = wave_field(params, wake_length_m)

    transverse = _quantize(field.transverse, DISPLACEMENT_DECIMALS)
    divergent = _quantize(field.divergent, DISPLACEMENT_DECIMALS)
    combined = _quantize(transverse + divergent, DISPLACEMENT_DECIMALS)

    return WaveFieldResponse(
        duck_length_m=request.duck_length_m,
        swimming_speed_m_s=request.swimming_speed_m_s,
        froude_number=field.froude_number,
        kelvin_angle_deg=KELVIN_HALF_ANGLE_DEG,
        wake_length_m=wake_length_m,
        transverse_wavelength_m=field.transverse_wavelength_m,
        divergent_wavelength_m=field.divergent_wavelength_m,
        nx=len(field.x_m),
        ny=len(field.y_m),
        x_m=_quantize(field.x_m, COORDINATE_DECIMALS).tolist(),
        y_m=_quantize(field.y_m, COORDINATE_DECIMALS).tolist(),
        transverse=transverse.tolist(),
        divergent=divergent.tolist(),
        combined=combined.tolist(),
    )
