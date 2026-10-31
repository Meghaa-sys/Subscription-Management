"""Root URL configuration. Every API route lives under /api/."""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

handler404 = "common.views.json_not_found"
handler500 = "common.views.json_server_error"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/", include("common.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("subscriptions.urls")),
    path("api/", include("billing.urls")),
]
