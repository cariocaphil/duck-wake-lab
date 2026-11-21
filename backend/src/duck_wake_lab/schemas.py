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


class DuckMotionRequest(BaseModel):
    """Duck length and swimming speed shared by all wake-related requests.

    API contract bounds are ``duck_length_m > 0`` and
    ``swimming_speed_m_s >= 0``. Slider UX ranges live in
    ``shared/wake-parameter-ranges.json`` and are not enforced here.
    Physics uses ``body_length_m`` / ``speed_m_s``; the service layer maps
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


class WakeRequest(DuckMotionRequest):
    """Parameters for computing wake geometry."""

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


DuckSpeciesValue = Literal["teal", "mallard", "muscovy"]
ChatMessageRole = Literal["user", "assistant"]


class ChatHistoryMessage(BaseModel):
    """One prior turn from the client. System roles are never accepted."""

    model_config = ConfigDict(extra="forbid")

    role: ChatMessageRole
    content: str = Field(min_length=1, max_length=1000)


class DuckExplainContext(BaseModel):
    """Simulation parameters sent with a speaking-duck question.

    Derived physics (Froude, angles, wavelengths) are computed on the server.
    """

    model_config = ConfigDict(extra="forbid")

    species: DuckSpeciesValue = Field(
        description="Educational duck species preset selected in the UI."
    )
    duck_length_m: float = Field(
        gt=0,
        allow_inf_nan=False,
        description="Duck body length in meters.",
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


class DuckExplainRequest(BaseModel):
    """Ask the speaking duck a physics question about the current simulation."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=500)
    context: DuckExplainContext
    history: list[ChatHistoryMessage] = Field(
        default_factory=list,
        max_length=10,
        description=(
            "Prior user/assistant turns. System instructions are server-owned."
        ),
    )


class DuckExplainResponse(BaseModel):
    """Plain-text answer from the speaking duck."""

    model_config = ConfigDict(extra="forbid")

    answer: str


class WaveFieldRequest(DuckMotionRequest):
    """Parameters for the illustrative wave-interference field.

    Same validation as :class:`WakeRequest` but without ``physics_mode``:
    the field depends only on duck length and swimming speed.
    """


class WaveFieldResponse(BaseModel):
    """Gridded transverse/divergent/combined displacement (illustrative).

    ``transverse``, ``divergent`` and ``combined`` are ``ny`` rows of ``nx``
    values (row = y index, column = x index) in arbitrary dimensionless
    units. ``combined`` equals ``transverse + divergent`` (within float
    tolerance). This is an illustrative interference model, not a physically
    exact duck wake.
    """

    model_config = ConfigDict(extra="forbid")

    duck_length_m: float = Field(allow_inf_nan=False)
    swimming_speed_m_s: float = Field(allow_inf_nan=False)
    froude_number: float = Field(allow_inf_nan=False)
    kelvin_angle_deg: float = Field(
        allow_inf_nan=False,
        description="Kelvin envelope half-angle in degrees; fixed reference.",
    )
    wake_length_m: float = Field(allow_inf_nan=False)
    transverse_wavelength_m: float = Field(
        allow_inf_nan=False,
        description="Illustrative transverse wavelength rule L * (1 + 2 Fr).",
    )
    divergent_wavelength_m: float = Field(
        allow_inf_nan=False,
        description="Illustrative divergent wavelength (fraction of transverse).",
    )
    nx: int = Field(ge=2)
    ny: int = Field(ge=3)
    x_m: list[float] = Field(description="Grid x coordinates (m), -wake_length..0.")
    y_m: list[float] = Field(description="Grid y coordinates (m), symmetric about 0.")
    transverse: list[list[float]] = Field(
        description="Transverse displacement, [ny][nx], arbitrary units."
    )
    divergent: list[list[float]] = Field(
        description="Divergent displacement, [ny][nx], arbitrary units."
    )
    combined: list[list[float]] = Field(
        description="Transverse plus divergent displacement, [ny][nx]."
    )

    @model_validator(mode="after")
    def validate_grid_contract(self) -> Self:
        """Ensure coordinate/field shapes agree and every value is finite."""
        if len(self.x_m) != self.nx or len(self.y_m) != self.ny:
            raise ValueError("x_m/y_m lengths must match nx/ny")
        if not all(math.isfinite(v) for v in (*self.x_m, *self.y_m)):
            raise ValueError("grid coordinates must be finite")
        fields = {
            "transverse": self.transverse,
            "divergent": self.divergent,
            "combined": self.combined,
        }
        for name, grid in fields.items():
            if len(grid) != self.ny or any(len(row) != self.nx for row in grid):
                raise ValueError(f"{name} must have shape [ny][nx]")
            if any(not math.isfinite(v) for row in grid for v in row):
                raise ValueError(f"{name} must contain only finite numbers")
        return self
