from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import DocumentRequirement, FormField, PermitType, Sektor, WorkflowStage
from .serializers import (
    DocumentRequirementSerializer,
    FormFieldSerializer,
    PermitTypeDetailSerializer,
    PermitTypeListSerializer,
    SektorDetailSerializer,
    SektorSerializer,
    WorkflowStageSerializer,
)


class SektorViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only sektor catalog."""

    permission_classes = [AllowAny]
    lookup_field = "key"

    def get_queryset(self):
        qs = Sektor.objects.filter(is_active=True).annotate(
            permit_count=Count("permit_types", filter=Q(permit_types__is_published=True))
        )
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SektorDetailSerializer
        return SektorSerializer


class PermitTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only permit type catalog.
    Returns the full schema (stages + fields + requirements) on detail —
    this is what the frontend uses to render the dynamic form.
    """

    permission_classes = [AllowAny]
    lookup_field = "key"
    filterset_fields = ["sektor__key", "is_berusaha", "is_published"]
    search_fields = ["name", "description", "product_name"]
    ordering_fields = ["name", "sla_days", "created_at"]

    def get_queryset(self):
        return (
            PermitType.objects.filter(is_published=True)
            .select_related("sektor")
            .prefetch_related("stages", "form_fields", "doc_requirements")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PermitTypeDetailSerializer
        return PermitTypeListSerializer

    @action(detail=True, methods=["get"], url_path="schema")
    def schema(self, request, key=None):
        """
        Returns the full dynamic form schema for this izin.
        Consumed by <DynamicForm/> on the frontend.
        """
        obj = self.get_object()
        return Response(PermitTypeDetailSerializer(obj).data)


# ── Admin Engine Builder ViewSets (staff-only write) ──────────────────────────


class AdminSektorViewSet(viewsets.ModelViewSet):
    """Admin CRUD for Sektor. Superadmin only."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = "key"

    def get_queryset(self):
        return Sektor.objects.annotate(
            permit_count=Count("permit_types", filter=Q(permit_types__is_published=True))
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SektorDetailSerializer
        return SektorSerializer


class AdminPermitTypeViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for PermitType (izin config).
    PUT/PATCH bump schema_version to protect in-flight submissions.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = "key"
    filterset_fields = ["sektor__key", "is_published"]

    def get_queryset(self):
        return PermitType.objects.select_related("sektor").prefetch_related(
            "stages", "form_fields", "doc_requirements"
        )

    def get_serializer_class(self):
        if self.action in ("list",):
            return PermitTypeListSerializer
        return PermitTypeDetailSerializer

    def perform_update(self, serializer):
        # Bump schema_version on every edit to protect in-flight snapshots
        instance = serializer.instance
        serializer.save(schema_version=instance.schema_version + 1)

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, key=None):
        pt = self.get_object()
        pt.is_published = True
        pt.save(update_fields=["is_published"])
        return Response(PermitTypeListSerializer(pt).data)

    @action(detail=True, methods=["post"], url_path="unpublish")
    def unpublish(self, request, key=None):
        pt = self.get_object()
        pt.is_published = False
        pt.save(update_fields=["is_published"])
        return Response(PermitTypeListSerializer(pt).data)


class AdminStageViewSet(viewsets.ModelViewSet):
    """Admin CRUD for WorkflowStage within an izin."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = WorkflowStageSerializer

    def get_queryset(self):
        permit_key = self.kwargs.get("permit_key")
        return WorkflowStage.objects.filter(permit_type__key=permit_key).order_by("order")

    def perform_create(self, serializer):
        permit = PermitType.objects.get(key=self.kwargs["permit_key"])
        serializer.save(permit_type=permit)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    def perform_update(self, serializer):
        serializer.save()
        permit = serializer.instance.permit_type
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, permit_key=None):
        """Bulk reorder: body = [{"id": "...", "order": N}, ...]"""
        for item in request.data:
            WorkflowStage.objects.filter(id=item["id"]).update(order=item["order"])
        permit = PermitType.objects.get(key=permit_key)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])
        return Response({"detail": "Urutan stage diperbarui."})


class AdminFormFieldViewSet(viewsets.ModelViewSet):
    """Admin CRUD for FormField within an izin."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = FormFieldSerializer

    def get_queryset(self):
        permit_key = self.kwargs.get("permit_key")
        return FormField.objects.filter(permit_type__key=permit_key).order_by("order")

    def perform_create(self, serializer):
        permit = PermitType.objects.get(key=self.kwargs["permit_key"])
        serializer.save(permit_type=permit)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    def perform_update(self, serializer):
        serializer.save()
        permit = serializer.instance.permit_type
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, permit_key=None):
        for item in request.data:
            FormField.objects.filter(id=item["id"]).update(order=item["order"])
        permit = PermitType.objects.get(key=permit_key)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])
        return Response({"detail": "Urutan field diperbarui."})


class AdminDocRequirementViewSet(viewsets.ModelViewSet):
    """Admin CRUD for DocumentRequirement within an izin."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DocumentRequirementSerializer

    def get_queryset(self):
        permit_key = self.kwargs.get("permit_key")
        return DocumentRequirement.objects.filter(permit_type__key=permit_key).order_by("order")

    def perform_create(self, serializer):
        permit = PermitType.objects.get(key=self.kwargs["permit_key"])
        serializer.save(permit_type=permit)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    def perform_update(self, serializer):
        serializer.save()
        permit = serializer.instance.permit_type
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])
