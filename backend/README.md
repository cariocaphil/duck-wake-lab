# Duck Wake Lab — Backend

Python FastAPI + NumPy backend for the Duck Wake Lab simulator.

- `GET /api/health` — liveness check
- `POST /api/wake` — wake geometry and Froude metadata from duck length, swimming speed, and an optional `physics_mode` (`kelvin` default, or `advanced`) (see `contracts/openapi.yaml`)
- `POST /api/wave-field` — illustrative transverse / divergent / combined wave-interference grid from duck length and swimming speed (not a physically exact wake; see the root README). The backend does no animation: time-dependent state (duck distance, paddling) lives in the frontend, and the response is computed only when parameters change.
- `duck_wake_lab.physics` — UI-agnostic Froude / Kelvin / apparent-wake / illustrative wave-field domain layer

See the root [README](../README.md) for installation, API details, and running locally.
