# Duck Wake Lab — Backend

Python FastAPI + NumPy backend for the Duck Wake Lab simulator.

- `GET /api/health` — liveness check
- `POST /api/wake` — Kelvin wake geometry and Froude metadata from duck length and swimming speed (see `contracts/openapi.yaml`)
- `duck_wake_lab.physics` — UI-agnostic Froude / Kelvin domain layer

See the root [README](../README.md) for installation, API details, and running locally.
