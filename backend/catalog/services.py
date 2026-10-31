"""Catalogue business logic."""
from django.db import transaction
from rest_framework.exceptions import ValidationError


def _sync_variants(product, variants):
    """Apply a full variant list: update by id, create without id, retire the rest."""
    existing = {variant.id: variant for variant in product.variants.all()}
    keep = set()
    for data in variants:
        variant_id = data.pop("id", None)
        if variant_id is None:
            keep.add(product.variants.create(**data).id)
            continue
        variant = existing.get(variant_id)
        if variant is None:
            raise ValidationError({"variants": [f"Variant {variant_id} is not on this product."]})
        for field, value in data.items():
            setattr(variant, field, value)
        variant.is_active = data.get("is_active", True)
        variant.save()
        keep.add(variant_id)

    # Old subscriptions may reference omitted variants, so they are retired, not removed.
    product.variants.exclude(id__in=keep).update(is_active=False)


@transaction.atomic
def save_product(product, data):
    """Save a new or existing product together with its taxes and variants."""
    variants = data.pop("variants", None)
    taxes = data.pop("taxes", None)
    for field, value in data.items():
        setattr(product, field, value)
    product.save()
    if taxes is not None:
        product.taxes.set(taxes)
    if variants is not None:
        _sync_variants(product, variants)
    return product


def retire_variant(variant):
    """Soft delete one variant."""
    variant.is_active = False
    variant.save(update_fields=["is_active"])
