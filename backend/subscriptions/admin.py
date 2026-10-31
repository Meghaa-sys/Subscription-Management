from django.contrib import admin

from .models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Subscription,
    SubscriptionLine,
    SubscriptionStatusHistory,
)


class QuotationTemplateLineInline(admin.TabularInline):
    model = QuotationTemplateLine
    extra = 0
    raw_id_fields = ("product", "variant")


@admin.register(QuotationTemplate)
class QuotationTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "plan", "validity_days", "is_active")
    search_fields = ("name",)
    list_select_related = ("plan",)
    inlines = [QuotationTemplateLineInline]


@admin.register(QuotationTemplateLine)
class QuotationTemplateLineAdmin(admin.ModelAdmin):
    list_display = ("id", "template", "product", "variant", "quantity")
    search_fields = ("template__name", "product__name")
    list_select_related = ("template", "product", "variant")


class SubscriptionLineInline(admin.TabularInline):
    model = SubscriptionLine
    extra = 0
    raw_id_fields = ("product", "variant")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "number", "customer", "plan", "status", "start_date", "expiry_date", "next_billing_date")
    list_filter = ("status",)
    search_fields = ("number", "customer__name")
    list_select_related = ("customer", "plan")
    raw_id_fields = ("customer", "plan", "template", "salesperson", "payment_term")
    readonly_fields = ("number", "status", "next_billing_date")
    inlines = [SubscriptionLineInline]


@admin.register(SubscriptionLine)
class SubscriptionLineAdmin(admin.ModelAdmin):
    list_display = ("id", "subscription", "product", "quantity", "unit_price", "tax_amount", "amount")
    search_fields = ("subscription__number", "product__name")
    list_select_related = ("subscription", "product")
    raw_id_fields = ("subscription", "product", "variant")


@admin.register(SubscriptionStatusHistory)
class SubscriptionStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "subscription", "from_status", "to_status", "changed_by", "changed_at", "note")
    search_fields = ("subscription__number", "note")
    list_select_related = ("subscription", "changed_by")
    raw_id_fields = ("subscription", "changed_by")
