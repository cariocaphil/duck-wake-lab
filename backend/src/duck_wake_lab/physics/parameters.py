"""Immutable duck parameters for wake physics calculations."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class DuckParameters:
    """Validated body length and swimming speed for a duck.

    Attributes:
        body_length_m: Characteristic body length in meters (must be > 0).
        speed_m_s: Swimming speed in meters per second (must be >= 0).
    """

    body_length_m: float
    speed_m_s: float

    def __post_init__(self) -> None:
        if not math.isfinite(self.body_length_m) or self.body_length_m <= 0:
            raise ValueError(
                "body_length_m must be a finite number greater than 0"
            )
        if not math.isfinite(self.speed_m_s) or self.speed_m_s < 0:
            raise ValueError(
                "speed_m_s must be a finite number greater than or equal to 0"
            )
