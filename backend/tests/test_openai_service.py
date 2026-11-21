"""Unit tests for the OpenAI service client cache (no live provider calls)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from duck_wake_lab.openai_service import (
    complete_chat,
    reset_openai_client_for_tests,
)


@pytest.fixture(autouse=True)
def _reset_client_cache() -> None:
    reset_openai_client_for_tests()
    yield
    reset_openai_client_for_tests()


def test_complete_chat_reuses_openai_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-not-real")
    monkeypatch.setenv("OPENAI_TIMEOUT_S", "30")

    mock_response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content="Quack! Reused client."),
            )
        ]
    )
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch(
        "duck_wake_lab.openai_service.OpenAI",
        return_value=mock_client,
    ) as openai_ctor:
        first = complete_chat([{"role": "user", "content": "Why a V?"}])
        second = complete_chat([{"role": "user", "content": "What is Froude?"}])

    assert first == "Quack! Reused client."
    assert second == "Quack! Reused client."
    assert openai_ctor.call_count == 1
    assert mock_client.chat.completions.create.call_count == 2


def test_complete_chat_rebuilds_client_when_timeout_changes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-not-real")
    monkeypatch.setenv("OPENAI_TIMEOUT_S", "30")

    mock_response = SimpleNamespace(
        choices=[
            SimpleNamespace(message=SimpleNamespace(content="ok")),
        ]
    )
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch(
        "duck_wake_lab.openai_service.OpenAI",
        return_value=mock_client,
    ) as openai_ctor:
        complete_chat([{"role": "user", "content": "First"}])
        monkeypatch.setenv("OPENAI_TIMEOUT_S", "45")
        complete_chat([{"role": "user", "content": "Second"}])

    assert openai_ctor.call_count == 2
