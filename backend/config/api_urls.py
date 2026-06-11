"""API v1 URL registry — each app registers its own router here."""
from django.urls import include, path
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "version": "2.0.0"})


urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("auth/", include("apps.accounts.urls")),
    path("engine/", include("apps.engine.urls")),
    path("submissions/", include("apps.submissions.urls")),
    path("verification/", include("apps.verification.urls")),
    path("documents/", include("apps.documents.urls")),
    path("permits/", include("apps.permits.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("reference/", include("apps.reference.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("rdtr/", include("apps.rdtr.urls")),
    path("whatsapp/", include("apps.whatsapp.urls")),
]
