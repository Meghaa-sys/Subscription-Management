"""Role based permissions. Data ownership is enforced separately in get_queryset."""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdmin(BasePermission):
    """Admin only."""

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_admin_role)


class IsStaffOrAdmin(BasePermission):
    """Internal users: staff and admin."""

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_internal)


class IsCustomer(BasePermission):
    """Customer portal users."""

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_customer_role)


class AdminWriteStaffRead(BasePermission):
    """
    Admin writes, staff reads. A view can set `customers_can_read = True` to also
    let customers read it; such a view must limit customers to active rows.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return user.is_internal or getattr(view, "customers_can_read", False)
        return user.is_admin_role
