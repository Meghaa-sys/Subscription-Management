from django.contrib import admin

from .models import PaymentTerm, Product, ProductVariant, RecurringPlan, Tax


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "product_type", "sales_price", "cost_price", "is_active")
    list_filter = ("product_type", "is_active")
    search_fields = ("name",)
    filter_horizontal = ("taxes",)
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "attribute", "value", "extra_price", "is_active")
    search_fields = ("product__name", "attribute", "value")
    list_select_related = ("product",)


@admin.register(Tax)
class TaxAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "tax_type", "rate", "is_active")
    list_filter = ("tax_type", "is_active")
    search_fields = ("name",)


@admin.register(RecurringPlan)
class RecurringPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price", "billing_period", "min_quantity", "start_date", "end_date", "is_active")
    list_filter = ("billing_period", "is_active")
    search_fields = ("name",)


@admin.register(PaymentTerm)
class PaymentTermAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "due_days")
    search_fields = ("name",)
