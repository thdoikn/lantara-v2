"""API v1 URL registry."""
from django.urls import include, path
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter

from apps.engine.views import SektorViewSet, PermitTypeViewSet


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "version": "2.0.0"})


# Top-level router — sektors and permit-types available directly at /api/v1/
router = DefaultRouter()
router.register("sektors", SektorViewSet, basename="sektor")
router.register("permit-types", PermitTypeViewSet, basename="permit-type")

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("", include(router.urls)),
    path("auth/", include("apps.accounts.urls")),
    path("submissions/", include("apps.submissions.urls")),
    path("documents/", include("apps.documents.urls")),
    path("permits/", include("apps.permits.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("reference/", include("apps.reference.urls")),
]
