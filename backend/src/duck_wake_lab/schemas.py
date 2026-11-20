"""Pydantic request and response models for the Duck Wake Lab API."""

from __future__ import annotations

import math
from typing import Self

from pydantic import BaseModel, Field, model_validator

from duck_wake_lab.parameter_ranges import load_parameter_ranges

_RANGES = load_parameter_ranges()
_LENGTH = _RANGES["duck_length_m"]
_SPEED = _RANGES["speed_m_s"]


class WakeRequest(BaseModel):
    """Parameters for computing Kelvin wake envelope geometry.

    Bounds come from ``shared/wake-parameter-ranges.json`` (monorepo).
    Physics uses ``body_length_m``; ``wake_service`` maps
    ``duck_length_m`` to that field.
    """

    duck_length_m: float = Field(
        ge=_LENGTH["min"],
        le=_LENGTH["max"],
        allow_inf_nan=False,
        description=(
            "Duck body length in meters (API/UI name). "
            "Mapped to physics DuckParameters.body_length_m in wake_service."
        ),
    )
    speed_m_s: float = Field(
        ge=_SPEED["min"],
        le=_SPEED["max"],
        allow_inf_nan=False,
    )


class WakeResponse(BaseModel):
    """Wake geometry and physics metadata for visualization.

    Contract (not physics): equal-length finite coordinate arrays that
    start at the origin. Envelope angle relationships belong in physics tests.
    """

    duck_length_m: float = Field(allow_inf_nan=False)
    speed_m_s: float = Field(allow_inf_nan=False)
    froude_number: float = Field(allow_inf_nan=False)
    half_angle_rad: float = Field(allow_inf_nan=False)
    half_angle_deg: float = Field(allow_inf_nan=False)
    wake_length_m: float = Field(allow_inf_nan=False)
    port_x_m: list[float]
    port_y_m: list[float]
    starboard_x_m: list[float]
    starboard_y_m: list[float]

    @model_validator(mode="after")
    def validate_coordinate_contract(self) -> Self:
        """Ensure port/starboard arrays share length, are finite, and start at 0."""
        arrays = (
            self.port_x_m,
            self.port_y_m,
            self.starboard_x_m,
            self.starboard_y_m,
        )
        lengths = {len(arr) for arr in arrays}
        if len(lengths) != 1:
            raise ValueError(
                "port and starboard coordinate arrays must have the same length"
            )
        n = lengths.pop()
        if n < 2:
            raise ValueError("coordinate arrays must contain at least 2 points")

        for name, arr in (
            ("port_x_m", self.port_x_m),
            ("port_y_m", self.port_y_m),
            ("starboard_x_m", self.starboard_x_m),
            ("starboard_y_m", self.starboard_y_m),
        ):
            if any(not math.isfinite(value) for value in arr):
                raise ValueError(f"{name} must contain only finite numbers")

        if (
            self.port_x_m[0] != 0.0
            or self.port_y_m[0] != 0.0
            or self.starboard_x_m[0] != 0.0
            or self.starboard_y_m[0] != 0.0
        ):
            raise ValueError("wake arms must start at the origin (0, 0)")

        return self
