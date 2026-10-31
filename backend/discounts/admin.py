from django.contrib import admin

from .models import Discount, DiscountRequest, DiscountUsage, SubscriptionDiscount


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "discount_type", "value", "applies_to", "start_date", "end_date", "usage_limit", "times_used", "is_active")
    list_filter = ("discount_type", "applies_to", "is_active")
    search_fields = ("name",)
    filter_horizontal = ("products",)
    raw_id_fields = ("created_by",)
    readonly_fields = ("times_used",)


@admin.register(SubscriptionDiscount)
class SubscriptionDiscountAdmin(admin.ModelAdmin):
    list_display = ("id", "subscription", "discount", "added_by", "added_at")
    search_fields = ("subscription__number", "discount__name")
    list_select_related = ("subscription", "discount", "added_by")
    raw_id_fields = ("subscription", "discount", "added_by")


@admin.register(DiscountUsage)
class DiscountUsageAdmin(admin.ModelAdmin):
    list_display = ("id", "discount", "invoice", "amount", "used_at")
    search_fields = ("discount__name", "invoice__number")
    list_select_related = ("discount", "invoice")
    raw_id_fields = ("discount", "invoice")


@admin.register(DiscountRequest)
class DiscountRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "subscription", "status", "handled_by", "discount", "created_at")
    list_filter = ("status",)
    search_fields = ("customer__name", "subscription__number", "message")
    list_select_related = ("customer", "subscription", "handled_by", "discount")
    raw_id_fields = ("customer", "subscription", "handled_by", "discount")
