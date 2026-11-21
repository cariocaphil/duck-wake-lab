"""FastAPI application entry point for Duck Wake Lab."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from duck_wake_lab.schemas import WakeRequest, WakeResponse
from duck_wake_lab.wake_service import compute_wake

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
