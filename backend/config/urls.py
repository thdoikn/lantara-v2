"""Root URL configuration."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # mozilla_django_oidc internal session endpoints — required by SessionRefresh middleware
    path("oidc/", include("mozilla_django_oidc.urls")),
    path("api/v1/", include("config.api_urls")),
]
