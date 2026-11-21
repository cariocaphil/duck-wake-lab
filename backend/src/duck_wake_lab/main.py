"""FastAPI application entry point for Duck Wake Lab."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from duck_wake_lab.duck_explain_service import (
    OpenAIConfigError,
    OpenAIProviderError,
    explain_duck_physics,
)
from duck_wake_lab.schemas import (
    DuckExplainRequest,
    DuckExplainResponse,
    WakeRequest,
    WakeResponse,
    WaveFieldRequest,
    WaveFieldResponse,
)
from duck_wake_lab.wake_service import compute_wake
from duck_wake_lab.wave_field_service import compute_wave_field

app = FastAPI(
    title="Duck Wake Lab",
    description="API for the Duck Wake Lab physics simulator",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(status="ok")


@app.post("/api/wake", response_model=WakeResponse)
def wake(request: WakeRequest) -> WakeResponse:
    """Compute wake geometry (Kelvin envelope and apparent wake) for a duck."""
    return compute_wake(request)


@app.post("/api/wave-field", response_model=WaveFieldResponse)
def wave_field(request: WaveFieldRequest) -> WaveFieldResponse:
    """Compute the illustrative transverse/divergent wave-interference field."""
    return compute_wave_field(request)


@app.post("/api/duck/explain", response_model=DuckExplainResponse)
def duck_explain(request: DuckExplainRequest) -> DuckExplainResponse:
    """Ask the speaking duck to explain wake physics for the current simulation."""
    try:
        return explain_duck_physics(request)
    except OpenAIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIProviderError as exc:
        raise HTTPException(status_code=502, detail=exc.public_message) from exc
