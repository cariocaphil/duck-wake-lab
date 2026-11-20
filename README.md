# Duck Wake Lab

Interactive educational physics simulator that explores the V-shaped wake produced by swimming ducks.

Users will eventually be able to select duck species, adjust body length and swimming speed, watch an animated wake visualization, and switch between physics models—with a playful speaking duck that explains the science.

## Planned physics levels

| Level | Name | Description |
| --- | --- | --- |
| 1 | **Kelvin Wake** | Idealized model based on classical Kelvin wake theory |
| 2 | **Advanced Physics** | Speed-dependent wave patterns and wave visibility |

## Technology stack

**Frontend:** React 19, TypeScript, Vite, SVG visualization, Vitest, React Testing Library, ESLint

**Backend:** Python 3.12+, uv, FastAPI, NumPy, Pydantic, pytest, Ruff

No database, authentication, UI component framework, or global state library.

## Project structure

```text
duck-wake-lab/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── types.ts
│   │   │   └── wakeClient.ts
│   │   ├── components/
│   │   │   ├── AppHeader.tsx
│   │   │   ├── RangeField.tsx
│   │   │   ├── WakeControls.tsx
│   │   │   └── WakeVisualization.tsx
│   │   ├── hooks/
│   │   │   └── useWakeQuery.ts
│   │   ├── pages/
│   │   │   └── WakePage.tsx
│   │   ├── App.tsx
│   │   ├── App.test.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   └── duck_wake_lab/
│   │       ├── __init__.py
│   │       ├── main.py
│   │       ├── schemas.py
│   │       ├── wake_service.py
│   │       └── physics/
│   │           ├── __init__.py
│   │           ├── parameters.py
│   │           ├── froude.py
│   │           └── kelvin.py
│   ├── tests/
│   │   ├── test_health.py
│   │   ├── test_wake.py
│   │   ├── test_parameters.py
│   │   ├── test_froude.py
│   │   └── test_kelvin.py
│   ├── pyproject.toml
│   └── uv.lock
├── README.md
└── .gitignore
```

## Physics engine

The backend `physics` package is a small, UI-agnostic NumPy domain layer. It has no dependency on FastAPI, React, or any visualization library.

### Froude number

The dimensionless Froude number compares swimming speed to a gravity–length scale:

\[
Fr = \frac{v}{\sqrt{gL}}
\]

where \(v\) is speed (m/s), \(g = 9.81\) m/s², and \(L\) is body length (m). Larger \(Fr\) means inertia dominates gravity for the duck’s size.

### Kelvin wake angle

In deep water, classical Kelvin theory predicts a V-shaped wake envelope whose half-angle from the centerline is constant:

\[
\theta = \arcsin(1/3) \approx 19.47^\circ
\]

This model only draws that theoretical envelope as two straight rays behind a duck at the origin swimming in \(+x\). The angle does **not** depend on speed or body length in this simplified model—the Froude number is computed separately and shown in the UI.

### Interactive slider expectations

| User change | Expected result |
| --- | --- |
| Duck length | Wake sample extent scales (`wake_length_m = duck_length_m × 10`) |
| Swimming speed | Froude number changes; V geometry does **not** widen |
| Both | Kelvin half-angle stays ≈ 19.47° |

The visualization displays Froude number and Kelvin half-angle next to the SVG so that speed-independent geometry is explicit.

### Limitations

- No transverse/divergent wave interference pattern (only the envelope arms)
- No speed-dependent wake angle or wave visibility
- Idealized deep-water assumption
- `KelvinWakeBoundaries` is a frozen dataclass, but its NumPy array fields remain mutable in place

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

### Running physics tests

```bash
cd backend
uv run pytest
```

## API

### `GET /api/health`

```json
{ "status": "ok" }
```

### `POST /api/wake`

Request:

```json
{
  "duck_length_m": 0.5,
  "speed_m_s": 1.2
}
```

Validated ranges: length `0.2–1.0` m, speed `0.1–3.0` m/s (`allow_inf_nan=False`).

Response includes echoed inputs, `froude_number`, Kelvin half-angle, `wake_length_m`, and port/starboard coordinate arrays from the NumPy Kelvin engine.

## Local installation

### Prerequisites

- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (manages Python and backend dependencies)

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

Start the backend (from `backend/`):

```bash
uv run uvicorn duck_wake_lab.main:app --reload --port 8000
```

Start the frontend (from `frontend/`):

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to FastAPI on port 8000.

Adjust duck length and swimming speed; the SVG wake updates from `POST /api/wake`.

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
