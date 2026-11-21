# Duck Wake Lab

Interactive educational physics simulator for the V-shaped wake produced by a swimming duck.

**Today:** pick a duck species (Teal 0.35 m, Mallard 0.55 m, Muscovy 0.75 m; illustrative default body lengths only), adjust duck length and swimming speed, and choose a physics mode (Kelvin or Advanced) in the browser; FastAPI computes wake geometry with the NumPy physics engine; React draws the result as an SVG and shows Froude number and wake half-angles. Selecting a species resets the length to its default and keeps the speed; the length can then be overridden manually without changing the species (the UI then marks it as a "custom length").

**Wave interference:** below the wake view, a top-down map shows an *illustrative* transverse / divergent / combined wave pattern behind the duck, with an explanation of constructive and destructive interference (see [Wave interference model](#wave-interference-model-illustrative)).

**Animated swimming:** in that same panel a duck swims through the water while the waves evolve, with Play / Pause, Reset and 0.5× / 1× / 2× playback controls (see [Animated swimming and wave propagation](#animated-swimming-and-wave-propagation)). The Kelvin line drawing in the Wake panel stays static.

**Later:** a speaking duck that explains the science.

## Planned physics levels

| Level | Name | Description |
| --- | --- | --- |
| 1 | **Kelvin** (default) | Idealized deep-water envelope; fixed half-angle ≈ 19.47° |
| 2 | **Advanced** | Kelvin envelope plus a simplified, Froude-dependent *apparent* wake angle (educational approximation) |

The wave-interference view is separate from these two modes: it is an extra visualization of the waves *inside* the wake and is not affected by the Kelvin/Advanced selection.

## Technology stack

**Frontend:** React 19, TypeScript, Vite, SVG and Canvas, Zod, typed-openapi, Vitest, React Testing Library, ESLint

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
4. React calls `POST /api/wake` and `POST /api/wave-field` through the generated client (thin `wakeClient` wrapper).

Backend OpenAPI drift is covered by `tests/test_openapi_contract.py` (compares the YAML to `app.openapi()` for the wake and wave-field surfaces). Frontend codegen drift is covered by `npm run check:api` (regenerate, then fail if generated files are dirty).

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
│   │   ├── animation/           # Pure animation clock (simulation.ts), duck pose helpers
│   │   ├── hooks/               # useDebouncedQuery, useWakeQuery, useWaveFieldQuery, useWakeAnimation
│   │   ├── waves/waveField.ts   # Pure helpers: family selection, color scale, static and animated pixels
│   │   ├── pages/WakePage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/
│   ├── src/duck_wake_lab/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── wake_service.py
│   │   ├── wave_field_service.py
│   │   └── physics/             # froude, kelvin, advanced, waves
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
2. The physics mode selector (Kelvin or Advanced) is part of the same controlled state. After a short debounce, the frontend posts via the generated client; in-flight requests are aborted when any input (including the mode) changes again, and stale responses are ignored.
3. The backend builds `DuckParameters`, computes Froude number, and samples Kelvin envelope arms with `wake_length_m = duck_length_m × 10`. In advanced mode it also samples the apparent wake arms.
4. The SVG renders `port_boundary` / `starboard_boundary` Point2D arrays (Kelvin envelope), and in advanced mode `apparent_port_boundary` / `apparent_starboard_boundary` plus a legend. Froude number and angles come from the response.
5. In parallel, a second query (`useWaveFieldQuery`, same debounce/abort/stale-response mechanics via `useDebouncedQuery`) posts length and speed to `/api/wave-field`. It does not depend on the physics mode or the selected wave family. A Canvas draws the selected grid with a fixed color scale, and an SVG overlay adds the duck, scrolling water marks and optional Kelvin boundary lines. The animation runs locally on that one response (no request per frame).

### Slider expectations (Kelvin model)

| User change | Expected result |
| --- | --- |
| Duck length | Wake sample extent grows or shrinks |
| Swimming speed | Froude number changes; V geometry does **not** widen |
| Both | Kelvin half-angle stays ≈ 19.47° |
| Physics mode → Advanced | Kelvin envelope stays dashed and fixed; a narrower apparent wake appears once `Fr > √2 ≈ 1.41` |

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

- The Kelvin/Advanced geometry is envelope arms only; the transverse/divergent interference pattern is a separate illustrative model (see below)
- The Kelvin envelope angle has no speed dependence (see Advanced mode below for the apparent wake)
- Idealized deep-water assumption

### Physics modes

| Mode | Meaning |
| --- | --- |
| `kelvin` (default) | Classical fixed envelope, half-angle ≈ 19.47°. The apparent wake equals the envelope. |
| `advanced` | The Kelvin envelope remains fixed at ≈ 19.47°, plus an *apparent wake*: the narrower region where the most visible waves may concentrate at higher Froude numbers. |

The two angles are distinct concepts. The **Kelvin envelope** is the classical outer V and never changes with speed. The **apparent wake** is the dominant visible wave pattern. The advanced model never reduces the envelope angle.

#### Advanced approximation

\[
\theta_{\text{apparent}} = \min\!\left(\theta_{\text{Kelvin}},\ \arctan\frac{0.5}{Fr}\right),
\qquad
\theta_{\text{Kelvin}} = \arcsin\frac{1}{3}
\]

with the length-based Froude number \(Fr = v / \sqrt{gL}\). The apparent angle equals the Kelvin angle until \(Fr > 0.5 / \tan\theta_{\text{Kelvin}} = \sqrt{2} \approx 1.41\), and decreases with speed above that. At \(Fr = 0\) it is the Kelvin angle. Implemented in `physics/advanced.py` (`apparent_wake_half_angle_rad`).

**This is an illustrative educational approximation, not a universally valid hydrodynamic law.** Limitations:

- The coefficient 0.5 is not derived from the water-wave equations.
- The apparent wake itself has no interference or amplitude field (it is drawn as straight arms); no CFD or particle simulation.
- Deep water only: no finite depth, surface tension, or hull-shape effects.
- Froude number is based on body length, as for ships; a duck is not a ship hull.
- With the slider ranges (length 0.2 to 1.0 m, speed 0.1 to 3.0 m/s), the narrowing is only reachable for short ducks at high speed (Teal needs more than about 2.6 m/s; Mallard and Muscovy cannot reach `Fr > 1.41`). Below that threshold Advanced mode looks identical to Kelvin, and the UI says so. Such speeds are far beyond real duck swimming.

### Wave interference model (illustrative)

`physics/waves.py` builds a deterministic 2D surface-displacement field behind the duck from the superposition principle

\[
\eta(x,y)=\sum_i A_i(x,y)\cos\big(\phi_i(x,y)\big),
\qquad
\eta_{\text{combined}}=\eta_{\text{transverse}}+\eta_{\text{divergent}}
\]

With \(s=-x\ge 0\) the distance behind the duck and \(L\) the duck length (all lengths below are in duck lengths, so the pattern depends only on \(Fr\); species change the scale, not the look, at equal \(Fr\)):

| Piece | Rule (illustrative) |
| --- | --- |
| Wavelength | \(\lambda_t = L\,(1+2\,Fr)\), \(\lambda_d = 0.5\,\lambda_t\). Grows with speed so the pattern visibly responds. |
| Transverse phase | \(\phi_t = k_t\,(s + y^2/(2R))\) with \(R = 8L\) (`TRANSVERSE_CURVATURE_RADIUS_FACTOR`): crests across the direction of travel, bowing back toward the duck at the edges. |
| Divergent phase | \(\phi_d = k_d\,(s\cos\psi + \lvert y\rvert\sin\psi)\), \(\psi=\arcsin(1/\sqrt3)\approx 35.3^\circ\), with \(\lvert y\rvert\) smoothed on the axis: chevron-shaped diagonal crests. |
| Envelopes | Smooth ramp-in from \(s=0\) (nothing ahead of the duck); a smooth lateral window tied to the Kelvin half-angle (transverse 0.7, divergent 0.9 of the cone); \(1/\sqrt{1+s/L}\) decay. |
| Amplitudes | Transverse 1.0, divergent 0.7: arbitrary, dimensionless numbers. |
| Determinism | No random phases. The field depends on \(y\) only through \(y^2\) and \(\lvert y\rvert\), so it is exactly mirror-symmetric. Speed 0 gives a flat field. |
| Grid | Fixed 121 × 49 points over \(x\in[-10L,0]\), \(\lvert y\rvert \le 1.1\cdot 10L\tan\theta_K\) (not client-controllable; about 200 KB of JSON including the quadrature grids). |

**What is illustrative and not physically derived:** the wavelength rule (real deep-water transverse waves scale like \(2\pi v^2/g\); that is compressed here so it stays readable across the slider range), the curvature radius, the divergent angle and wavelength ratio, every envelope, the decay, and the amplitudes. This is **not** a fluid simulation, **not** the Kelvin wake integral, and does **not** reproduce a physically exact duck wake. There is no energy dissipation or amplitude calibration. The static field is the `t = 0` frame of the animation described below. The Kelvin formulas and Froude number are reused unchanged; the Kelvin angle only supplies the reference envelope.

In the UI, *Transverse*, *Divergent* and *Both* (the combined field) are switched client-side from one response, with no extra request. One symmetric color scale (the largest displacement the animation can reach: the sum of the two families' amplitude envelopes) is used for every view and every frame, so a weak family looks weak next to the combined field and regions where interference strengthens or cancels are visible. Orange is a crest (positive displacement), blue a trough (negative); where the two families have the same sign they reinforce (constructive interference), where the signs differ they partially or fully cancel (destructive interference).

### Animated swimming and wave propagation

The wave panel animates a duck swimming along +x through the PR #7 field. The work is split into three parts:

- **Physics** (backend, only when parameters change): the spatial field, wavelengths and angular frequencies.
- **Animation** (`frontend/src/animation/simulation.ts`, `hooks/useWakeAnimation.ts`): elapsed time, duck distance and wave phase, driven by `requestAnimationFrame` timestamp deltas, so it is independent of the monitor refresh rate. Frames update refs, the canvas and SVG attributes directly; React does not re-render per frame and no API request is made per frame.
- **Rendering** (`WaveVisualization`): draws the current state.

**Swimming speed vs animation speed.** *Swimming speed* (m/s) is a physical parameter: it moves the duck and sets the Froude number and wavelengths, and it is changed in Controls. *Animation speed* (0.5× / 1× / 2×) only scales playback time; it never changes the physics. Pause freezes both the duck and the waves, Reset returns time, distance and phase to zero and keeps the selected species and physics parameters. Distance and phase are accumulated frame by frame, so changing a parameter mid-swim does not teleport the duck or snap the phase.

**Coordinates.** Physical coordinates are in meters in the world frame: the duck starts at \(x=0\) and its distance is \(\int v\,dt\). The view uses a following camera: the duck and its wake are drawn at fixed *camera-relative* coordinates (duck at the origin, wake at \(x\le 0\)), so the wake cannot detach from its source, while the world-fixed dots scroll by \(-\text{distance}\) to show the motion. The duck is drawn at true scale (its length equals the duck length in meters).

**Wave propagation.** The traveling wave is

\[
\eta(x,y,t)=A(x,y)\cos\big(\phi(x,y)-\omega t\big)
=A\cos\phi\,\cos\omega t + A\sin\phi\,\sin\omega t
\]

using the existing PR #7 amplitude \(A\) and phase \(\phi\) for each family. The cosine grid is the existing field; the API additionally returns the quadrature grids \(A\sin\phi\) (`transverse_quadrature`, `divergent_quadrature`) and each family's \(\omega\) (`transverse_omega_rad_s`, `divergent_omega_rad_s`), so the client only multiplies and adds per pixel. At \(t=0\) the picture equals the static field exactly. Each family has its own \(\omega=\sqrt{g\,k}\) with \(k=2\pi/\lambda\) (deep-water dispersion), so the two systems drift past each other and the interference visibly changes.

**What is derived and what is a visual approximation**

| Aspect | Status |
| --- | --- |
| Spatial field \(A,\phi\), wavelengths, Froude number, Kelvin boundaries | Same illustrative model as PR #7 (see above) |
| Duck position | Derived: \(\int v\,dt\) from the selected swimming speed |
| \(\omega=\sqrt{gk}\) per family | Deep-water dispersion applied to the illustrative wavelengths |
| Crest drift astern relative to the duck | **Visual approximation, not physically exact** |
| Fully developed wake at \(t=0\), paddling feet, dot spacing | Visual only |

**This is an animated dispersion-based approximation, not a strictly steady Kelvin wake.** In an exactly steady wake the crests are stationary relative to the duck (\(\omega=0\) in the duck's frame). Here the crests deliberately drift astern at roughly \(\omega/k\) so that wave propagation is visible. That rate is not derived from the duck speed (the compressed wavelength rule does not satisfy the steady-wake condition), so wave phase velocity and swimming speed are different quantities, and the crest motion should not be read as the real dynamics of a duck wake.

**Known limitation.** Accumulated time, distance and phase are kept across parameter changes, but a new wavelength gives the crests a new spatial pattern, so a slider change can cause a visible discontinuity in the picture. It is not interpolated in this version.

**Reduced motion and visibility.** With `prefers-reduced-motion: reduce` the animation starts paused and Play opts in. When the tab is hidden the frame loop is suspended (state is kept) and resumes without a time jump. Frame deltas are also clamped to 100 ms. The wave-field response is larger than before (five grids, about 200 KB of JSON) because of the quadrature grids.

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
  "swimming_speed_m_s": 1.2,
  "physics_mode": "kelvin"
}
```

| Field | API validation |
| --- | --- |
| `duck_length_m` | number, exclusive minimum 0 (`> 0`) |
| `swimming_speed_m_s` | number, minimum 0 (`>= 0`) |
| `physics_mode` | optional; `"kelvin"` (default) or `"advanced"`; other values return 422 |

Response:

```json
{
  "physics_mode": "kelvin",
  "froude_number": 0.541,
  "kelvin_angle_deg": 19.47,
  "apparent_angle_deg": 19.47,
  "wake_length_m": 5.0,
  "port_boundary": [{ "x_m": 0.0, "y_m": 0.0 }, "..."],
  "starboard_boundary": [{ "x_m": 0.0, "y_m": 0.0 }, "..."],
  "apparent_port_boundary": [{ "x_m": 0.0, "y_m": 0.0 }, "..."],
  "apparent_starboard_boundary": [{ "x_m": 0.0, "y_m": 0.0 }, "..."]
}
```

- All angles are **half-angles in degrees**; all coordinates are in meters.
- `kelvin_angle_deg` and `port_boundary` / `starboard_boundary` are the Kelvin envelope and are identical in every mode.
- `apparent_angle_deg` and `apparent_*_boundary` are the apparent wake. In `kelvin` mode they equal the envelope; in `advanced` mode `apparent_angle_deg <= kelvin_angle_deg`.

NumPy arrays are converted to JSON-serializable `Point2D` lists at the API boundary.

### `POST /api/wave-field`

Illustrative wave-interference field (see [Wave interference model](#wave-interference-model-illustrative)). It depends only on duck length and swimming speed and has no `physics_mode`.

Request (same validation as `/api/wake`; extra fields such as `physics_mode` return 422):

```json
{ "duck_length_m": 0.55, "swimming_speed_m_s": 1.2 }
```

Response (abridged):

```json
{
  "duck_length_m": 0.55,
  "swimming_speed_m_s": 1.2,
  "froude_number": 0.516,
  "kelvin_angle_deg": 19.47,
  "wake_length_m": 5.5,
  "transverse_wavelength_m": 1.12,
  "divergent_wavelength_m": 0.56,
  "transverse_omega_rad_s": 7.4,
  "divergent_omega_rad_s": 10.5,
  "nx": 121,
  "ny": 49,
  "x_m": [-5.5, "...", 0.0],
  "y_m": [-2.14, "...", 2.14],
  "transverse": [[0.0, "..."], "..."],
  "divergent": [[0.0, "..."], "..."],
  "combined": [[0.0, "..."], "..."],
  "transverse_quadrature": [[0.0, "..."], "..."],
  "divergent_quadrature": [[0.0, "..."], "..."]
}
```

- Grids are `[ny][nx]` (row = y index, column = x index); coordinates are in meters, displacements are arbitrary dimensionless units.
- `transverse` and `divergent` are rounded to 4 decimals and `combined` is computed from those rounded arrays, so `combined = transverse + divergent` holds to within float tolerance (about 1e-9).
- `transverse_quadrature` / `divergent_quadrature` are \(A\sin\phi\) for the same envelopes (same rounding), and `*_omega_rad_s` is the illustrative deep-water angular frequency of each family; together they let a client animate \(A\cos(\phi-\omega t)\). This is a visual approximation, not a strictly steady Kelvin wake.
- All values are finite; repeated identical requests return identical bodies.

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

Animation tests use fake `requestAnimationFrame` timestamps (no real delays). To run only those:

```bash
cd frontend
npx vitest run src/animation src/hooks/useWakeAnimation.test.tsx \
  src/components/AnimationControls.test.tsx src/components/WaveVisualization.test.tsx \
  src/App.animation.test.tsx src/waves/waveField.test.ts
cd ../backend
uv run pytest tests/test_waves.py tests/test_wave_field.py tests/test_openapi_contract.py
```

## Features planned for future PRs

- Interactive exploration improvements
- Educational explanations from a speaking duck
