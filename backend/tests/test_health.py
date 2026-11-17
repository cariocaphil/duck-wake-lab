"""Tests for the health endpoint."""

from fastapi.testclient import TestClient

from duck_wake_lab.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    """GET /api/health returns HTTP 200 and status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
