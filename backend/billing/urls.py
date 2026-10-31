from django.urls import path

from .views import BillingRunView

urlpatterns = [
    path("billing/run/", BillingRunView.as_view(), name="billing-run"),
]
