"""Password policy for every account."""
from django.core.exceptions import ValidationError


class StrongPasswordValidator:
    """More than 8 characters with an uppercase, a lowercase and a special character."""

    def validate(self, password, user=None):
        missing = []
        if len(password) <= 8:
            missing.append("more than 8 characters")
        if not any(char.isupper() for char in password):
            missing.append("an uppercase letter")
        if not any(char.islower() for char in password):
            missing.append("a lowercase letter")
        if not any(not char.isalnum() and not char.isspace() for char in password):
            missing.append("a special character")
        if missing:
            raise ValidationError(
                f"Password must have {', '.join(missing)}.", code="password_too_weak"
            )

    def get_help_text(self):
        return (
            "Your password must have more than 8 characters, including an uppercase "
            "letter, a lowercase letter and a special character."
        )
