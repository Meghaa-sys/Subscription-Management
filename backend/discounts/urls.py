from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.include_root_view = False
router.register("discounts", views.DiscountViewSet, basename="discount")
router.register("discount-requests", views.DiscountRequestViewSet, basename="discount-request")

urlpatterns = [path("", include(router.urls))]
