"""Physics-aware speaking-duck explanations (OpenAI + domain snapshot)."""

from __future__ import annotations

import math
from dataclasses import dataclass

from duck_wake_lab.openai_service import (
    OpenAIConfigError,
    OpenAIProviderError,
    complete_chat,
)
from duck_wake_lab.physics import (
    KELVIN_HALF_ANGLE_DEG,
    DuckParameters,
    PhysicsMode,
    apparent_wake_half_angle_rad,
    divergent_wavelength_m,
    froude_number,
    transverse_wavelength_m,
)
from duck_wake_lab.schemas import DuckExplainRequest, DuckExplainResponse
from duck_wake_lab.wake_service import WAKE_LENGTH_FACTOR

SYSTEM_INSTRUCTION = """\
You are the swimming duck in Duck Wake Lab, an educational wake simulator.
Personality: friendly, curious, playful, patient, and enthusiastic about \
physics—but scientifically responsible.

Guidelines:
- Prefer concise answers of 2–5 sentences.
- Explain technical terms simply; use analogies when helpful.
- Occasionally say "Quack!" but not in every sentence.
- Refer to the current simulation numbers provided in the context.
- Never invent numerical results; only use values from the context or \
clear qualitative reasoning from them.
- Acknowledge uncertainty when something is outside the models.
- Stay focused on swimming, wakes, waves, and related physics.
- Avoid excessive jokes.

Scientific honesty (always distinguish these three layers):
1. Kelvin wake geometry: idealized deep-water envelope with fixed half-angle \
arcsin(1/3) ≈ 19.47°. The V outer boundaries do not widen with speed.
2. Advanced apparent wake: a simplified educational Froude-dependent \
narrowing of the *visible* wake; not a universally valid hydrodynamic law.
3. Animated wave-interference / dispersion view: an illustrative top-down \
pattern for teaching interference and motion—not an exact fluid-dynamics \
simulation and not a full Kelvin-wake integral solution.

If asked whether the simulation is physically exact, say clearly that it is \
educational and approximate.
"""


@dataclass(frozen=True)
class PhysicsSnapshot:
    """Server-derived quantities for the speaking duck (not client-trusted)."""

    species: str
    duck_length_m: float
    swimming_speed_m_s: float
    physics_mode: str
    froude_number: float
    kelvin_angle_deg: float
    apparent_angle_deg: float
    wake_length_m: float
    transverse_wavelength_m: float
    divergent_wavelength_m: float


def build_physics_snapshot(request: DuckExplainRequest) -> PhysicsSnapshot:
    """Derive Froude, angles, and illustrative wavelengths from request context."""
    ctx = request.context
    params = DuckParameters(
        body_length_m=ctx.duck_length_m,
        speed_m_s=ctx.swimming_speed_m_s,
    )
    froude = froude_number(params)
    wake_length_m = ctx.duck_length_m * WAKE_LENGTH_FACTOR

    if ctx.physics_mode == PhysicsMode.ADVANCED:
        apparent_angle_deg = math.degrees(apparent_wake_half_angle_rad(froude))
    else:
        apparent_angle_deg = KELVIN_HALF_ANGLE_DEG

    return PhysicsSnapshot(
        species=ctx.species,
        duck_length_m=ctx.duck_length_m,
        swimming_speed_m_s=ctx.swimming_speed_m_s,
        physics_mode=ctx.physics_mode,
        froude_number=froude,
        kelvin_angle_deg=KELVIN_HALF_ANGLE_DEG,
        apparent_angle_deg=apparent_angle_deg,
        wake_length_m=wake_length_m,
        transverse_wavelength_m=transverse_wavelength_m(params),
        divergent_wavelength_m=divergent_wavelength_m(params),
    )


def _format_context_message(snapshot: PhysicsSnapshot) -> str:
    return (
        "Current simulation context (authoritative numbers; do not invent others):\n"
        f"- species: {snapshot.species}\n"
        f"- duck_length_m: {snapshot.duck_length_m:.4g}\n"
        f"- swimming_speed_m_s: {snapshot.swimming_speed_m_s:.4g}\n"
        f"- physics_mode: {snapshot.physics_mode}\n"
        f"- froude_number: {snapshot.froude_number:.4g}\n"
        f"- kelvin_angle_deg (envelope half-angle): {snapshot.kelvin_angle_deg:.4g}\n"
        f"- apparent_angle_deg: {snapshot.apparent_angle_deg:.4g}\n"
        f"- wake_length_m (sample extent): {snapshot.wake_length_m:.4g}\n"
        f"- transverse_wavelength_m (illustrative): "
        f"{snapshot.transverse_wavelength_m:.4g}\n"
        f"- divergent_wavelength_m (illustrative): "
        f"{snapshot.divergent_wavelength_m:.4g}\n"
        "Remember: the animated interference pattern is illustrative only."
    )


def build_chat_messages(
    request: DuckExplainRequest,
    snapshot: PhysicsSnapshot,
) -> list[dict[str, str]]:
    """Assemble OpenAI messages; system prompt is always server-controlled."""
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_INSTRUCTION},
        {"role": "system", "content": _format_context_message(snapshot)},
    ]
    for turn in request.history:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": request.question})
    return messages


def explain_duck_physics(request: DuckExplainRequest) -> DuckExplainResponse:
    """Build physics context, call OpenAI, return the duck's answer."""
    snapshot = build_physics_snapshot(request)
    messages = build_chat_messages(request, snapshot)
    answer = complete_chat(messages)
    return DuckExplainResponse(answer=answer)


__all__ = [
    "OpenAIConfigError",
    "OpenAIProviderError",
    "PhysicsSnapshot",
    "build_chat_messages",
    "build_physics_snapshot",
    "explain_duck_physics",
]
