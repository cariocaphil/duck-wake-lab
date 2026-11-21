# Duck Wake Lab

Interactive educational physics simulator for the V-shaped wake produced by a swimming duck.

**Today:** adjust duck length and swimming speed in the browser; FastAPI computes Kelvin wake geometry with the NumPy physics engine; React draws the result as an SVG and shows Froude number and Kelvin half-angle.

**Later:** duck species presets, animated swimming, advanced speed-dependent physics, and a speaking duck that explains the science.

## Planned physics levels

| Level | Name | Description |
| --- | --- | --- |
| 1 | **Kelvin Wake** (current) | Idealized deep-water envelope; fixed half-angle ≈ 19.47° |
| 2 | **Advanced Physics** (planned) | Speed-dependent wave patterns and wave visibility |

## Technology stack

**Frontend:** React 19, TypeScript, Vite, SVG, Zod, typed-openapi, Vitest, React Testing Library, ESLint

**Backend:** Python 3.12+, uv, FastAPI, NumPy, Pydantic, pytest, Ruff

No database, authentication, UI component framework, or global state library.

## Contract-first architecture

The shared API boundary is a checked-in OpenAPI 3.0.3 document:

[`contracts/openapi.yaml`](contracts/openapi.yaml)

```text
contracts/openapi.yaml
        │
        ├── FastAPI Pydantic models (hand-aligned; drift-tested)
        └── typed-openapi → frontend/src/api/generated/ (TS client + Zod)
```

1. Edit the OpenAPI contract when the API shape changes.
2. Align FastAPI request/response models to match.
3. Regenerate the TypeScript client and Zod schemas.
4. React calls `POST /api/wake` through the generated client (thin `wakeClient` wrapper).

Backend OpenAPI drift is covered by `tests/test_openapi_contract.py` (compares the YAML to `app.openapi()` for the wake surface). Frontend codegen drift is covered by `npm run check:api` (regenerate, then fail if generated files are dirty).

## Project structure

```text
duck-wake-lab/
├── contracts/
│   └── openapi.yaml             # OpenAPI 3.0.3 source of truth
├── shared/
│   └── wake-parameter-ranges.json   # Slider UX bounds only (not API contract)
├── frontend/
│   ├── typed-openapi.config.ts
│   ├── src/
│   │   ├── api/
│   │   │   ├── generated/       # typed-openapi output (do not hand-edit)
│   │   │   └── wakeClient.ts    # Thin wrapper + error mapping
│   │   ├── components/
│   │   ├── hooks/useWakeQuery.ts
│   │   ├── pages/WakePage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/
│   ├── src/duck_wake_lab/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── wake_service.py
│   │   └── physics/
│   └── tests/
└── README.md
```

### Shared parameter ranges vs API contract

[`shared/wake-parameter-ranges.json`](shared/wake-parameter-ranges.json) bounds the React sliders (length ≈ 0.2–1.0 m, speed ≈ 0.1–3.0 m/s). It is **not** the HTTP API contract.

The API accepts:

- `duck_length_m` > 0
- `swimming_speed_m_s` ≥ 0 (including zero)

That split lets backend/physics tests use edge values the UI does not expose.

## How the interactive slice works

```text
WakeControls  →  WakePage (debounce + abort)  →  generated client → POST /api/wake
                                                                    ↓
WakeVisualization (SVG + Fr / θ)  ←  JSON wake geometry (Point2D boundaries)
```

1. Sliders update length and speed (ranges from `shared/wake-parameter-ranges.json`).
2. After a short debounce, the frontend posts via the generated client; in-flight requests are aborted when inputs change again.
3. The backend builds `DuckParameters`, computes Froude number, and samples Kelvin envelope arms with `wake_length_m = duck_length_m × 10`.
4. The SVG renders `port_boundary` / `starboard_boundary` Point2D arrays. Froude number and Kelvin half-angle come from the response.

### Slider expectations (Kelvin model)

| User change | Expected result |
| --- | --- |
| Duck length | Wake sample extent grows or shrinks |
| Swimming speed | Froude number changes; V geometry does **not** widen |
| Both | Kelvin half-angle stays ≈ 19.47° |

## Physics engine

The `physics` package is a UI-agnostic NumPy domain layer. It has no dependency on FastAPI or React.

### Froude number

\[
Fr = \frac{v}{\sqrt{gL}}
\]

where \(v\) is speed (m/s), \(g = 9.81\) m/s², and \(L\) is body length (m).

### Kelvin wake angle

\[
\theta = \arcsin(1/3) \approx 19.47^\circ
\]

The duck sits at the origin and swims in \(+x\); wake arms extend in \(-x\) at \(\pm\theta\) from the centerline. In this simplified model the angle does **not** depend on speed or length.

### Limitations

- Envelope arms only (no transverse/divergent interference pattern)
- No speed-dependent wake angle or wave visibility
- Idealized deep-water assumption

### Usage example

```python
from duck_wake_lab.physics import (
    DuckParameters,
    froude_number,
    kelvin_wake_boundaries,
)

params = DuckParameters(body_length_m=0.4, speed_m_s=0.6)
fr = froude_number(params)

wake = kelvin_wake_boundaries(wake_length_m=5.0, n_points=51)
# wake.port_x_m, wake.port_y_m, wake.starboard_x_m, wake.starboard_y_m
```

## API

Contract: [`contracts/openapi.yaml`](contracts/openapi.yaml)

### `GET /api/health`

```json
{ "status": "ok" }
```

(Health is FastAPI-only; it is intentionally absent from the checked-in OpenAPI file.)

### `POST /api/wake`

Request:

```json
{
  "duck_length_m": 0.5,
  "swimming_speed_m_s": 1.2
}
```

| Field | API validation |
| --- | --- |
| `duck_length_m` | number, exclusive minimum 0 (`> 0`) |
| `swimming_speed_m_s` | number, minimum 0 (`>= 0`) |

Response:

```json
{
  "froude_number": 0.541,
  "kelvin_angle_deg": 19.47,
  "wake_length_m": 5.0,
  "port_boundary": [{ "x_m": 0.0, "y_m": 0.0 }, "..."],
  "starboard_boundary": [{ "x_m": 0.0, "y_m": 0.0 }, "..."]
}
```

NumPy arrays are converted to JSON-serializable `Point2D` lists at the API boundary.

## Local installation

### Prerequisites

- Node.js 20+
- [uv](https://docs.astral.sh/uv/)

### Backend

```bash
cd backend
uv sync
```

### Frontend

```bash
cd frontend
npm install
```

## Running locally

Backend (from `backend/`):

```bash
uv run uvicorn duck_wake_lab.main:app --reload --port 8000
```

Frontend (from `frontend/`):

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to FastAPI on port 8000.

Health check: http://localhost:8000/api/health → `{"status":"ok"}`

Interactive docs: http://localhost:8000/docs

## Regenerating the TypeScript client

From `frontend/`:

```bash
npm run generate:api
```

Configuration lives in [`frontend/typed-openapi.config.ts`](frontend/typed-openapi.config.ts). Output is written to `frontend/src/api/generated/` (client, default fetcher, and `.types.d.ts` sidecar). Do not hand-edit generated files; commit all siblings together.

Verify codegen is up to date:

```bash
npm run check:api
```

## Tests, linting, and type checking

### Backend

```bash
cd backend
uv run pytest
uv run ruff check .
```

### Frontend

```bash
cd frontend
npm test
npm run check:api
npm run lint
npm run typecheck
```

## Features planned for future PRs

- Advanced physics level (speed-dependent patterns and visibility)
- Animation and interactive exploration improvements
- Educational explanations from a speaking duck
- Species-specific body presets
