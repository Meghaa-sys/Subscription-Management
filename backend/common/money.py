"""Money helpers. All money in the system is Decimal, never float."""
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def money(value):
    """Round a value to two decimal places, half up."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)
