"""Pydantic request and response models for the Duck Wake Lab API."""

from __future__ import annotations

import math
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from duck_wake_lab.physics.mode import PhysicsMode

# Inline enum (not a $ref component) so the OpenAPI 3.0.3 default is preserved.
PhysicsModeValue = Literal[PhysicsMode.KELVIN, PhysicsMode.ADVANCED]


class Point2D(BaseModel):
    """A 2D point in meters (physics coordinates)."""

    model_config = ConfigDict(extra="forbid")

    x_m: float = Field(allow_inf_nan=False)
    y_m: float = Field(allow_inf_nan=False)


class WakeRequest(BaseModel):
    """Parameters for computing wake geometry.

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
    physics_mode: PhysicsModeValue = Field(
        default=PhysicsMode.KELVIN,
        description=(
            "Physics model: 'kelvin' (classical fixed envelope, default) or "
            "'advanced' (simplified Froude-dependent apparent wake)."
        ),
    )


class WakeResponse(BaseModel):
    """Wake geometry and physics metadata for visualization.

    Contract (not physics): equal-length finite Point2D arrays that
    start at the origin. Envelope angle relationships belong in physics tests.
    """

    model_config = ConfigDict(extra="forbid")

    physics_mode: PhysicsModeValue = Field(
        description="Physics mode that produced this response."
    )
    froude_number: float = Field(allow_inf_nan=False)
    kelvin_angle_deg: float = Field(
        allow_inf_nan=False,
        description="Kelvin envelope half-angle in degrees (arcsin(1/3)); fixed.",
    )
    apparent_angle_deg: float = Field(
        allow_inf_nan=False,
        description=(
            "Apparent (dominant visible) wake half-angle in degrees. Equals "
            "kelvin_angle_deg in kelvin mode; never exceeds it."
        ),
    )
    wake_length_m: float = Field(allow_inf_nan=False)
    port_boundary: list[Point2D]
    starboard_boundary: list[Point2D]
    apparent_port_boundary: list[Point2D]
    apparent_starboard_boundary: list[Point2D]

    @model_validator(mode="after")
    def validate_coordinate_contract(self) -> Self:
        """Ensure port/starboard arms share length, are finite, and start at 0."""
        arms = {
            "port_boundary": self.port_boundary,
            "starboard_boundary": self.starboard_boundary,
            "apparent_port_boundary": self.apparent_port_boundary,
            "apparent_starboard_boundary": self.apparent_starboard_boundary,
        }
        lengths = {len(arm) for arm in arms.values()}
        if len(lengths) != 1:
            raise ValueError("all coordinate arrays must have the same length")
        if lengths.pop() < 2:
            raise ValueError("coordinate arrays must contain at least 2 points")

        for name, arm in arms.items():
            if any(
                not math.isfinite(point.x_m) or not math.isfinite(point.y_m)
                for point in arm
            ):
                raise ValueError(f"{name} must contain only finite numbers")

        if any(arm[0].x_m != 0.0 or arm[0].y_m != 0.0 for arm in arms.values()):
            raise ValueError("wake arms must start at the origin (0, 0)")

        return self
