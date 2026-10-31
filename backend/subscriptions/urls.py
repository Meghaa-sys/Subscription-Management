from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.include_root_view = False
router.register("subscriptions", views.SubscriptionViewSet, basename="subscription")
router.register("quotation-templates", views.QuotationTemplateViewSet, basename="quotation-template")

urlpatterns = [path("", include(router.urls))]
