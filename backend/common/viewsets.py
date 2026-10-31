"""Small mixins shared by the API viewsets."""


class SoftDeleteMixin:
    """DELETE keeps the row for history and only sets is_active=False."""

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
