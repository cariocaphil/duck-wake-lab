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

**Frontend:** React 19, TypeScript, Vite, SVG, Vitest, React Testing Library, ESLint

**Backend:** Python 3.12+, uv, FastAPI, NumPy, Pydantic, pytest, Ruff

No database, authentication, UI component framework, or global state library.

## Project structure

```text
duck-wake-lab/
├── frontend/
│   ├── src/
│   │   ├── api/                 # Typed POST /api/wake client
│   │   ├── components/          # Controls + SVG visualization
│   │   ├── hooks/useWakeQuery.ts
│   │   ├── pages/WakePage.tsx   # State and fetch orchestration
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/
│   ├── src/duck_wake_lab/
│   │   ├── main.py              # FastAPI app + routes
│   │   ├── schemas.py           # Wake request/response models
│   │   ├── wake_service.py      # Physics orchestration
│   │   └── physics/             # UI-agnostic NumPy domain layer
│   └── tests/
├── README.md
└── .gitignore
```

## How the interactive slice works

```text
WakeControls  →  WakePage (debounce + abort)  →  POST /api/wake
                                                      ↓
WakeVisualization (SVG + Fr / θ)  ←  JSON wake geometry
```

1. Sliders update length (0.2–1.0 m) and speed (0.1–3.0 m/s).
2. After a short debounce, the frontend posts to FastAPI; in-flight requests are aborted when inputs change again.
3. The backend builds `DuckParameters`, computes Froude number, and samples Kelvin envelope arms with `wake_length_m = duck_length_m × 10`.
4. The SVG renders backend coordinates (no hardcoded V). Froude number and Kelvin half-angle are shown next to the plot.

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

### `GET /api/health`

```json
{ "status": "ok" }
```

### `POST /api/wake`

Request (validated with `allow_inf_nan=False`):

```json
{
  "duck_length_m": 0.5,
  "speed_m_s": 1.2
}
```

| Field | Range |
| --- | --- |
| `duck_length_m` | 0.2–1.0 m |
| `speed_m_s` | 0.1–3.0 m/s |

Response (shape):

```json
{
  "duck_length_m": 0.5,
  "speed_m_s": 1.2,
  "froude_number": 0.541,
  "half_angle_rad": 0.3398,
  "half_angle_deg": 19.47,
  "wake_length_m": 5.0,
  "port_x_m": [0.0, "..."],
  "port_y_m": [0.0, "..."],
  "starboard_x_m": [0.0, "..."],
  "starboard_y_m": [0.0, "..."]
}
```

Coordinate arrays come from the NumPy Kelvin engine (`list[float]` for JSON).

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
npm run lint
npm run typecheck
```

## Features planned for future PRs

- Advanced physics level (speed-dependent patterns and visibility)
- Animation and interactive exploration improvements
- Educational explanations from a speaking duck
- Species-specific body presets
