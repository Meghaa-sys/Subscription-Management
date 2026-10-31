"""Module-level names for choice sets, used by ENUM_NAME_OVERRIDES in the Swagger schema."""
from billing.models import Invoice
from catalog.models import Tax
from discounts.models import DiscountRequest
from subscriptions.models import Subscription

SubscriptionStatus = Subscription.Status
InvoiceStatus = Invoice.Status
DiscountRequestStatus = DiscountRequest.Status
AmountType = Tax.TaxType  # Taxes and discounts share the same percent/fixed choices.
