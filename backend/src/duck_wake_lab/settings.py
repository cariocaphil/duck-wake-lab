"""Lazy process-environment settings for the Speaking Duck (OpenAI).

Values are read on demand so missing credentials never block FastAPI
import or physics endpoints.
"""

from __future__ import annotations

import os


def openai_api_key() -> str | None:
    """Return OPENAI_API_KEY, or None when unset/blank."""
    value = os.environ.get("OPENAI_API_KEY", "").strip()
    return value or None


def openai_model() -> str:
    """Model id for chat completions (default: cost-efficient gpt-4o-mini)."""
    return os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"


def openai_timeout_s() -> float:
    """Request timeout in seconds."""
    raw = os.environ.get("OPENAI_TIMEOUT_S", "30").strip()
    try:
        timeout = float(raw)
    except ValueError:
        return 30.0
    return timeout if timeout > 0 else 30.0


def openai_max_output_tokens() -> int:
    """Upper bound on generated answer length."""
    raw = os.environ.get("OPENAI_MAX_OUTPUT_TOKENS", "300").strip()
    try:
        tokens = int(raw)
    except ValueError:
        return 300
    return tokens if tokens > 0 else 300
