from django.urls import path

from .views import MetaChoicesView

urlpatterns = [
    path("meta/choices/", MetaChoicesView.as_view(), name="meta-choices"),
]
