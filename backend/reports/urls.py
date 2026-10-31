from django.urls import path

from . import views

urlpatterns = [
    path("reports/summary/", views.SummaryView.as_view(), name="report-summary"),
    path("reports/revenue/", views.RevenueView.as_view(), name="report-revenue"),
    path("reports/overdue/", views.OverdueView.as_view(), name="report-overdue"),
    path(
        "reports/subscriptions-by-status/",
        views.SubscriptionsByStatusView.as_view(),
        name="report-subscriptions-by-status",
    ),
]
