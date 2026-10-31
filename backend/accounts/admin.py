from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm

from .models import Customer, PasswordResetToken, User


class UserCreationForm(AdminUserCreationForm):
    class Meta:
        model = User
        fields = ("email", "name", "role")


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserEditForm
    add_form = UserCreationForm
    list_display = ("id", "email", "name", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("email", "name")
    ordering = ("-id",)
    readonly_fields = ("created_at", "last_login")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("name", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Dates", {"fields": ("last_login", "created_at")}),
    )
    filter_horizontal = ()
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "role", "usable_password", "password1", "password2")}),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "expires_at", "used_at", "created_at")
    search_fields = ("user__email",)
    list_select_related = ("user",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "email", "phone", "created_at")
    search_fields = ("name", "company", "email", "phone")
    raw_id_fields = ("user",)
