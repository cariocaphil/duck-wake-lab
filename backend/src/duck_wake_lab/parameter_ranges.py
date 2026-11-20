"""Load shared wake parameter ranges from the monorepo ``shared/`` tree."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import TypedDict


class ParameterRange(TypedDict):
    min: float
    max: float
    step: float
    unit: str


class WakeParameterRanges(TypedDict):
    duck_length_m: ParameterRange
    swimming_speed_m_s: ParameterRange


def _shared_ranges_path() -> Path:
    # duck_wake_lab/ → src/ → backend/ → repo root
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "shared" / "wake-parameter-ranges.json"


@lru_cache(maxsize=1)
def load_parameter_ranges() -> WakeParameterRanges:
    """Return length/speed bounds from ``shared/wake-parameter-ranges.json``.

    Resolves via ``__file__`` (not cwd). Expects the monorepo layout with a
    sibling ``shared/`` directory next to ``backend/``.

    These ranges bound UI sliders only. The API contract is
    ``duck_length_m > 0`` and ``swimming_speed_m_s >= 0``.
    """
    path = _shared_ranges_path()
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return data  # type: ignore[return-value]
