# Duck Wake Lab — Backend

Python FastAPI + NumPy backend for the Duck Wake Lab simulator.

- `GET /api/health` — liveness check
- `POST /api/wake` — wake geometry and Froude metadata from duck length, swimming speed, and an optional `physics_mode` (`kelvin` default, or `advanced`) (see `contracts/openapi.yaml`)
- `duck_wake_lab.physics` — UI-agnostic Froude / Kelvin / apparent-wake domain layer

See the root [README](../README.md) for installation, API details, and running locally.
