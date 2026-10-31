"""Error handling: every error response body has a string `detail`."""
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler, set_rollback

logger = logging.getLogger(__name__)


class BusinessRuleError(APIException):
    """A request that is well formed but breaks a business rule. Returns 400."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This action is not allowed."
    default_code = "business_rule"


def _first_message(value):
    """Find the first error message in a nested DRF error structure."""
    if isinstance(value, dict):
        for item in value.values():
            found = _first_message(item)
            if found:
                return found
        return None
    if isinstance(value, (list, tuple)):
        for item in value:
            found = _first_message(item)
            if found:
                return found
        return None
    return str(value) if value else None


def _normalise(data):
    """Give any DRF error payload a string `detail`, keeping field errors beside it."""
    if isinstance(data, dict):
        if isinstance(data.get("detail"), str):
            return data
        body = {key: value for key, value in data.items() if key != "non_field_errors"}
        body["detail"] = _first_message(data) or "Invalid input."
        return body
    return {"detail": _first_message(data) or "Invalid input."}


def _convert(exc):
    """Turn framework-level Django exceptions into API exceptions."""
    if isinstance(exc, ProtectedError):
        return BusinessRuleError("This record is in use by other records and cannot be deleted.")
    if isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, "error_dict") else exc.messages
        return ValidationError(detail)
    return exc


def api_exception_handler(exc, context):
    """DRF exception handler producing the consistent error shape."""
    response = exception_handler(_convert(exc), context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        set_rollback()
        return Response(
            {"detail": "Something went wrong on our side. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    response.data = _normalise(response.data)
    return response
