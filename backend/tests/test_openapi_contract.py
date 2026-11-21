"""Compare checked-in OpenAPI contract with FastAPI's generated schema."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from duck_wake_lab.main import app

CONTRACT_PATH = (
    Path(__file__).resolve().parents[2] / "contracts" / "openapi.yaml"
)

# Metadata keys that may differ without implying contract drift.
_STRIP_KEYS = {
    "title",
    "description",
    "summary",
    "example",
    "examples",
    "deprecated",
    "externalDocs",
    "tags",
    "servers",
    "operationId",
}


def _strip_metadata(node: Any) -> Any:
    if isinstance(node, dict):
        return {
            key: _strip_metadata(value)
            for key, value in node.items()
            if key not in _STRIP_KEYS
        }
    if isinstance(node, list):
        return [_strip_metadata(item) for item in node]
    return node


def _normalize_exclusive_minimum(node: Any) -> Any:
    """Normalize exclusiveMinimum to OpenAPI 3.0.3 boolean form.

    OpenAPI 3.1 uses a numeric exclusiveMinimum; 3.0.3 uses
    ``minimum`` + ``exclusiveMinimum: true``. FastAPI/Pydantic emit the
    3.0.3 boolean form for ``Field(gt=...)``.
    """
    if isinstance(node, dict):
        normalized = {
            key: _normalize_exclusive_minimum(value) for key, value in node.items()
        }
        exclusive = normalized.get("exclusiveMinimum")
        if isinstance(exclusive, (int, float)) and not isinstance(exclusive, bool):
            # Convert 3.1-style numeric exclusiveMinimum into 3.0.3 form.
            normalized["minimum"] = exclusive
            normalized["exclusiveMinimum"] = True
        return normalized
    if isinstance(node, list):
        return [_normalize_exclusive_minimum(item) for item in node]
    return node


def _normalize(node: Any) -> Any:
    return _normalize_exclusive_minimum(_strip_metadata(node))


def _resolve_ref(schema: dict[str, Any], ref: str) -> dict[str, Any]:
    assert ref.startswith("#/")
    parts = ref[2:].split("/")
    node: Any = schema
    for part in parts:
        node = node[part]
    return node


WAKE_SCHEMA_NAMES = (
    "WakeRequest",
    "WakeResponse",
    "Point2D",
    "HTTPValidationError",
    "ValidationError",
)
WAVE_FIELD_SCHEMA_NAMES = (
    "WaveFieldRequest",
    "WaveFieldResponse",
    "HTTPValidationError",
    "ValidationError",
)


def _wake_operation_and_schemas(spec: dict[str, Any]) -> dict[str, Any]:
    """Extract the wake POST operation and related component schemas."""
    return _operation_and_schemas(spec, "/api/wake", WAKE_SCHEMA_NAMES)


def _operation_and_schemas(
    spec: dict[str, Any], path: str, relevant_names: tuple[str, ...]
) -> dict[str, Any]:
    """Extract a POST operation and the named component schemas."""
    paths = spec["paths"]
    assert path in paths
    post = paths[path]["post"]

    request_schema = post["requestBody"]["content"]["application/json"]["schema"]
    response_schema = post["responses"]["200"]["content"]["application/json"]["schema"]
    error_schema = post["responses"]["422"]["content"]["application/json"]["schema"]

    components = spec.get("components", {}).get("schemas", {})
    relevant = {name: components[name] for name in relevant_names if name in components}

    return _normalize(
        {
            "request": request_schema,
            "response": response_schema,
            "error": error_schema,
            "schemas": relevant,
        }
    )


def test_openapi_contract_matches_fastapi_wake_surface() -> None:
    """Checked-in YAML and FastAPI agree on meaningful wake contract shape."""
    with CONTRACT_PATH.open(encoding="utf-8") as handle:
        checked_in = yaml.safe_load(handle)

    assert checked_in["openapi"].startswith("3.0")
    runtime = app.openapi()

    # Health may exist only on the FastAPI app.
    assert "/api/health" in runtime["paths"]
    assert "/api/health" not in checked_in.get("paths", {})

    checked_wake = _wake_operation_and_schemas(checked_in)
    runtime_wake = _wake_operation_and_schemas(runtime)

    assert checked_wake["request"] == runtime_wake["request"]
    assert checked_wake["response"] == runtime_wake["response"]
    assert checked_wake["error"] == runtime_wake["error"]

    for name in ("WakeRequest", "WakeResponse", "Point2D"):
        assert name in checked_wake["schemas"]
        assert name in runtime_wake["schemas"]
        assert checked_wake["schemas"][name] == runtime_wake["schemas"][name]

    # Duck length uses OpenAPI 3.0.3 exclusive minimum boolean form.
    wake_request = checked_wake["schemas"]["WakeRequest"]
    length = wake_request["properties"]["duck_length_m"]
    assert length["minimum"] == 0
    assert length["exclusiveMinimum"] is True

    # physics_mode is optional, defaults to kelvin, and accepts two values.
    mode = wake_request["properties"]["physics_mode"]
    assert mode["enum"] == ["kelvin", "advanced"]
    assert mode["default"] == "kelvin"
    assert "physics_mode" not in wake_request["required"]

    # Cross-check $refs resolve in both documents.
    for spec in (checked_in, runtime):
        post = spec["paths"]["/api/wake"]["post"]
        for schema in (
            post["requestBody"]["content"]["application/json"]["schema"],
            post["responses"]["200"]["content"]["application/json"]["schema"],
        ):
            if "$ref" in schema:
                _resolve_ref(spec, schema["$ref"])


def test_openapi_contract_matches_fastapi_wave_field_surface() -> None:
    """Checked-in YAML and FastAPI agree on the wave-field contract shape."""
    with CONTRACT_PATH.open(encoding="utf-8") as handle:
        checked_in = yaml.safe_load(handle)
    runtime = app.openapi()

    checked = _operation_and_schemas(
        checked_in, "/api/wave-field", WAVE_FIELD_SCHEMA_NAMES
    )
    live = _operation_and_schemas(runtime, "/api/wave-field", WAVE_FIELD_SCHEMA_NAMES)

    assert checked["request"] == live["request"]
    assert checked["response"] == live["response"]
    assert checked["error"] == live["error"]
    for name in ("WaveFieldRequest", "WaveFieldResponse"):
        assert name in checked["schemas"]
        assert checked["schemas"][name] == live["schemas"][name]

    # The wave-field request has no physics_mode: it depends only on length/speed.
    request_props = checked["schemas"]["WaveFieldRequest"]["properties"]
    assert set(request_props) == {"duck_length_m", "swimming_speed_m_s"}
