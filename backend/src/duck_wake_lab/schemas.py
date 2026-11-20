"""Pydantic request and response models for the Duck Wake Lab API."""

from __future__ import annotations

import math
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Point2D(BaseModel):
    """A 2D point in meters (physics coordinates)."""

    model_config = ConfigDict(extra="forbid")

    x_m: float = Field(allow_inf_nan=False)
    y_m: float = Field(allow_inf_nan=False)


class WakeRequest(BaseModel):
    """Parameters for computing Kelvin wake envelope geometry.

    API contract bounds are ``duck_length_m > 0`` and
    ``swimming_speed_m_s >= 0``. Slider UX ranges live in
    ``shared/wake-parameter-ranges.json`` and are not enforced here.
    Physics uses ``body_length_m`` / ``speed_m_s``; ``wake_service`` maps
    these API fields.
    """

    model_config = ConfigDict(extra="forbid")

    duck_length_m: float = Field(
        gt=0,
        allow_inf_nan=False,
        description=(
            "Duck body length in meters (API/UI name). "
            "Mapped to physics DuckParameters.body_length_m in wake_service."
        ),
    )
    swimming_speed_m_s: float = Field(
        ge=0,
        allow_inf_nan=False,
        description="Swimming speed in meters per second.",
    )


class WakeResponse(BaseModel):
    """Wake geometry and physics metadata for visualization.

    Contract (not physics): equal-length finite Point2D arrays that
    start at the origin. Envelope angle relationships belong in physics tests.
    """

    model_config = ConfigDict(extra="forbid")

    froude_number: float = Field(allow_inf_nan=False)
    kelvin_angle_deg: float = Field(allow_inf_nan=False)
    wake_length_m: float = Field(allow_inf_nan=False)
    port_boundary: list[Point2D]
    starboard_boundary: list[Point2D]

    @model_validator(mode="after")
    def validate_coordinate_contract(self) -> Self:
        """Ensure port/starboard arms share length, are finite, and start at 0."""
        port = self.port_boundary
        starboard = self.starboard_boundary
        if len(port) != len(starboard):
            raise ValueError(
                "port and starboard coordinate arrays must have the same length"
            )
        if len(port) < 2:
            raise ValueError("coordinate arrays must contain at least 2 points")

        for name, arm in (("port_boundary", port), ("starboard_boundary", starboard)):
            if any(
                not math.isfinite(point.x_m) or not math.isfinite(point.y_m)
                for point in arm
            ):
                raise ValueError(f"{name} must contain only finite numbers")

        if (
            port[0].x_m != 0.0
            or port[0].y_m != 0.0
            or starboard[0].x_m != 0.0
            or starboard[0].y_m != 0.0
        ):
            raise ValueError("wake arms must start at the origin (0, 0)")

        return self
