"""OpenAPI helpers so the Swagger docs describe errors on every endpoint."""
from rest_framework import serializers


class DetailSerializer(serializers.Serializer):
    """Plain message response, also the shape of every error body."""

    detail = serializers.CharField()


ERROR_DESCRIPTIONS = {
    "400": "Business rule or validation error. Validation errors add field errors beside `detail`.",
    "401": "Not authenticated.",
    "403": "Your role cannot perform this action.",
    "404": "Not found, or it does not belong to you.",
}


def add_error_responses(result, generator, request, public):
    """Add the shared error responses to every operation in the schema."""
    schemas = result.setdefault("components", {}).setdefault("schemas", {})
    schemas["ErrorResponse"] = {
        "type": "object",
        "properties": {"detail": {"type": "string"}},
        "additionalProperties": True,
        "required": ["detail"],
    }
    error_content = {
        "application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}
    }
    for path in result.get("paths", {}).values():
        for operation in path.values():
            responses = operation.get("responses")
            if responses is None:
                continue
            for code, description in ERROR_DESCRIPTIONS.items():
                responses.setdefault(code, {"description": description, "content": error_content})
    return result
