"""Pydantic request and response models for the Duck Wake Lab API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class WakeRequest(BaseModel):
    """Parameters for computing Kelvin wake envelope geometry."""

    duck_length_m: float = Field(ge=0.2, le=1.0, allow_inf_nan=False)
    speed_m_s: float = Field(ge=0.1, le=3.0, allow_inf_nan=False)


class WakeResponse(BaseModel):
    """Wake geometry and physics metadata for visualization."""

    duck_length_m: float
    speed_m_s: float
    froude_number: float
    half_angle_rad: float
    half_angle_deg: float
    wake_length_m: float
    port_x_m: list[float]
    port_y_m: list[float]
    starboard_x_m: list[float]
    starboard_y_m: list[float]
