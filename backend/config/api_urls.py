"""API v1 URL registry."""
from django.urls import include, path
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter

from apps.engine.views import (
    SektorViewSet, PermitTypeViewSet,
    AdminSektorViewSet, AdminPermitTypeViewSet,
    AdminStageViewSet, AdminFormFieldViewSet, AdminDocRequirementViewSet,
)


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "version": "2.0.0"})


# Public read-only catalog
router = DefaultRouter()
router.register("sektors", SektorViewSet, basename="sektor")
router.register("permit-types", PermitTypeViewSet, basename="permit-type")

# Admin engine-builder (staff write)
admin_router = DefaultRouter()
admin_router.register("sektors", AdminSektorViewSet, basename="admin-sektor")
admin_router.register("permit-types", AdminPermitTypeViewSet, basename="admin-permit-type")

# Nested: /admin/engine/permit-types/{key}/stages/, /fields/, /doc-requirements/
def permit_nested_router():
    from django.urls import path as dpath
    return [
        dpath(
            "permit-types/<str:permit_key>/stages/",
            include([
                path("", AdminStageViewSet.as_view({"get": "list", "post": "create"})),
                path("<uuid:pk>/", AdminStageViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})),
                path("reorder/", AdminStageViewSet.as_view({"post": "reorder"})),
            ]),
        ),
        dpath(
            "permit-types/<str:permit_key>/fields/",
            include([
                path("", AdminFormFieldViewSet.as_view({"get": "list", "post": "create"})),
                path("<uuid:pk>/", AdminFormFieldViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})),
                path("reorder/", AdminFormFieldViewSet.as_view({"post": "reorder"})),
            ]),
        ),
        dpath(
            "permit-types/<str:permit_key>/doc-requirements/",
            include([
                path("", AdminDocRequirementViewSet.as_view({"get": "list", "post": "create"})),
                path("<uuid:pk>/", AdminDocRequirementViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})),
            ]),
        ),
    ]


urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("", include(router.urls)),
    path("auth/", include("apps.accounts.urls")),
    path("submissions/", include("apps.submissions.urls")),
    path("documents/", include("apps.documents.urls")),
    path("permits/", include("apps.permits.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("reference/", include("apps.reference.urls")),
    # Admin engine builder
    path("admin/engine/", include(admin_router.urls)),
    path("admin/engine/", include(permit_nested_router())),
    # Analytics (Phase 2)
    path("analytics/", include("apps.analytics.urls")),
]
