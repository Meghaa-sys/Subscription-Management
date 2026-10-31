from django.contrib import admin

from .models import Invoice, InvoiceLine, Payment


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    can_delete = False
    raw_id_fields = ("product",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "number", "customer", "subscription", "invoice_date", "due_date", "total", "amount_paid", "status")
    list_filter = ("status",)
    search_fields = ("number", "customer__name", "subscription__number")
    list_select_related = ("customer", "subscription")
    raw_id_fields = ("customer", "subscription")
    readonly_fields = ("number",)
    inlines = [InvoiceLineInline]


@admin.register(InvoiceLine)
class InvoiceLineAdmin(admin.ModelAdmin):
    list_display = ("id", "invoice", "description", "quantity", "unit_price", "discount_amount", "tax_amount", "line_total")
    search_fields = ("invoice__number", "description")
    list_select_related = ("invoice",)
    raw_id_fields = ("invoice", "product")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "invoice", "method", "amount", "payment_date", "recorded_by")
    list_filter = ("method",)
    search_fields = ("invoice__number", "note")
    list_select_related = ("invoice", "recorded_by")
    raw_id_fields = ("invoice", "recorded_by")
