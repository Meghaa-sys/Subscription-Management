from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.include_root_view = False
router.register("products", views.ProductViewSet, basename="product")
router.register("taxes", views.TaxViewSet, basename="tax")
router.register("plans", views.RecurringPlanViewSet, basename="plan")
router.register("payment-terms", views.PaymentTermViewSet, basename="payment-term")

urlpatterns = [path("", include(router.urls))]
