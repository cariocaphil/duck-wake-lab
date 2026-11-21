"""Thin OpenAI Chat Completions wrapper for the speaking duck.

Never logs question, history, or answer content.
"""

from __future__ import annotations

from typing import Any

from openai import APIError, APITimeoutError, OpenAI

from duck_wake_lab import settings


class OpenAIConfigError(Exception):
    """Raised when OPENAI_API_KEY is missing."""


class OpenAIProviderError(Exception):
    """Raised when the provider fails or times out (safe public message)."""

    def __init__(
        self,
        message: str = "The speaking duck could not answer right now.",
    ) -> None:
        super().__init__(message)
        self.public_message = message


def complete_chat(messages: list[dict[str, str]]) -> str:
    """Call OpenAI chat completions and return the assistant text.

    ``messages`` must already include the server-owned system instruction.
    """
    api_key = settings.openai_api_key()
    if api_key is None:
        raise OpenAIConfigError(
            "Speaking Duck is not configured. Set OPENAI_API_KEY in the "
            "backend process environment."
        )

    client = OpenAI(
        api_key=api_key,
        timeout=settings.openai_timeout_s(),
    )

    try:
        response = client.chat.completions.create(
            model=settings.openai_model(),
            messages=messages,  # type: ignore[arg-type]
            max_tokens=settings.openai_max_output_tokens(),
            temperature=0.7,
        )
    except APITimeoutError as exc:
        raise OpenAIProviderError(
            "The speaking duck timed out. Please try again."
        ) from exc
    except APIError as exc:
        raise OpenAIProviderError(
            "The speaking duck could not reach its brain. Please try again."
        ) from exc
    except Exception as exc:  # noqa: BLE001 — map unexpected SDK failures safely
        raise OpenAIProviderError() from exc

    choice = response.choices[0] if response.choices else None
    content: Any = choice.message.content if choice and choice.message else None
    if not isinstance(content, str) or not content.strip():
        raise OpenAIProviderError(
            "The speaking duck returned an empty answer. Please try again."
        )
    return content.strip()
