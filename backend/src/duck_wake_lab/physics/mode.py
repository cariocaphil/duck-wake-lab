"""Selectable physics modes for the wake model."""

from __future__ import annotations

from enum import StrEnum


class PhysicsMode(StrEnum):
    """Which wake model to use.

    ``KELVIN``: classical fixed-angle Kelvin envelope.
    ``ADVANCED``: Kelvin envelope plus a simplified, Froude-dependent
    apparent wake half-angle (educational approximation).
    """

    KELVIN = "kelvin"
    ADVANCED = "advanced"
