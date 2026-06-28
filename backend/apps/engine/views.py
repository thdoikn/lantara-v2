from django.db import transaction
from django.db.models import Count, F, Max, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import (
    DocumentRequirement,
    FormField,
    PermitType,
    PermitTypeVersion,
    Sektor,
    WorkflowStage,
)
from .serializers import (
    DocumentRequirementSerializer,
    FormFieldSerializer,
    PermitTypeDetailSerializer,
    PermitTypeListSerializer,
    PermitTypeVersionSerializer,
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


# Stage types that legitimately end a workflow.
# During a reorder, targeted rows are shifted into a temporary high band so no
# intermediate write collides with the unique (permit_type, order), which Postgres
# enforces per-statement (not deferred). `order` is a PositiveSmallIntegerField
# (smallint, max 32767), so the band must clear realistic stage/field counts yet
# stay well under the ceiling.
_REORDER_OFFSET = 10_000


def _apply_reorder(model, items) -> None:
    """Collision-safe bulk reorder for models with a unique (permit_type, order).

    Two-phase inside one transaction: shift the targeted rows into a high band
    first, then assign final orders. The builder always sends the full ordered
    list for the permit, so finals occupy a contiguous low range with nothing to
    collide against.
    """
    ids = [item["id"] for item in items]
    with transaction.atomic():
        model.objects.filter(id__in=ids).update(order=F("order") + _REORDER_OFFSET)
        for item in items:
            model.objects.filter(id=item["id"]).update(order=item["order"])


def _next_order(model, permit) -> int:
    """Next free order value for a new row (max+1), assigned server-side."""
    current_max = model.objects.filter(permit_type=permit).aggregate(m=Max("order"))["m"]
    return (current_max or 0) + 1


# Model fields recreated verbatim when rolling a permit back to an archived
# snapshot (id/permit_type are re-derived, everything else is copied).
_STAGE_RESTORE_FIELDS = [
    "key",
    "order",
    "name",
    "stage_type",
    "actor_role",
    "sla_hours",
    "requires_site_visit",
    "allowed_actions",
    "is_terminal",
    "instructions",
]
_FIELD_RESTORE_FIELDS = [
    "key",
    "label",
    "field_type",
    "section",
    "order",
    "required",
    "validation_json",
    "options_json",
    "prefill_from_profile",
    "help_text_field",
    "placeholder",
    "conditional_field_key",
    "conditional_field_value",
]
_DOC_RESTORE_FIELDS = [
    "key",
    "title",
    "description",
    "allowed_types",
    "max_bytes",
    "required",
    "order",
    "conditional_field_key",
    "conditional_field_value",
]
# Permit-level scalars that shape the form/SLA and are part of a version snapshot.
_PERMIT_RESTORE_FIELDS = [
    "description",
    "sla_days",
    "product_name",
    "legal_basis",
    "fee_description",
    "complaint_info",
]


def _checkpoint_version(pt: PermitType, note: str, user) -> PermitTypeVersion:
    """Archive pt's current full schema as a PermitTypeVersion (F5/F9).

    Idempotent per schema_version — re-publishing without edits won't duplicate."""
    snapshot = PermitTypeDetailSerializer(pt).data
    version, _ = PermitTypeVersion.objects.update_or_create(
        permit_type=pt,
        version=pt.schema_version,
        defaults={
            "snapshot": snapshot,
            "note": note,
            "created_by": user if getattr(user, "is_authenticated", False) else None,
        },
    )
    return version


def _restore_from_snapshot(pt: PermitType, snapshot: dict) -> None:
    """Replace pt's children + form scalars from an archived snapshot (F9 rollback)."""
    with transaction.atomic():
        for f in _PERMIT_RESTORE_FIELDS:
            if f in snapshot:
                setattr(pt, f, snapshot[f])
        pt.schema_version += 1
        pt.save()

        pt.stages.all().delete()
        pt.form_fields.all().delete()
        pt.doc_requirements.all().delete()

        WorkflowStage.objects.bulk_create(
            [
                WorkflowStage(permit_type=pt, **{k: s[k] for k in _STAGE_RESTORE_FIELDS if k in s})
                for s in snapshot.get("stages", [])
            ]
        )
        FormField.objects.bulk_create(
            [
                FormField(permit_type=pt, **{k: f[k] for k in _FIELD_RESTORE_FIELDS if k in f})
                for f in snapshot.get("form_fields", [])
            ]
        )
        DocumentRequirement.objects.bulk_create(
            [
                DocumentRequirement(
                    permit_type=pt, **{k: d[k] for k in _DOC_RESTORE_FIELDS if k in d}
                )
                for d in snapshot.get("doc_requirements", [])
            ]
        )


# Publish-readiness now lives in apps.engine.readiness so the list serializer can
# reuse it for the "not ready" badge.
from .readiness import publish_readiness_errors as _publish_readiness_errors  # noqa: E402


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

        errors = _publish_readiness_errors(pt)
        if errors:
            return Response(
                {"detail": "Izin belum siap diterbitkan.", "errors": errors},
                status=400,
            )

        # Archive this published config and mark it as the published baseline
        # so later edits surface as "unpublished changes" (F5/F9/F14).
        _checkpoint_version(pt, note="Diterbitkan", user=request.user)
        pt.is_published = True
        pt.published_schema_version = pt.schema_version
        pt.save(update_fields=["is_published", "published_schema_version"])
        return Response(PermitTypeListSerializer(pt).data)

    @action(detail=True, methods=["post"], url_path="unpublish")
    def unpublish(self, request, key=None):
        pt = self.get_object()
        pt.is_published = False
        pt.save(update_fields=["is_published"])
        return Response(PermitTypeListSerializer(pt).data)

    @action(detail=True, methods=["post"], url_path="clone")
    def clone(self, request, key=None):
        """Duplicate an izin (config + stages/fields/docs) as a new draft.

        The slowest admin task is rebuilding a similar permit by hand — cloning
        copies everything as unpublished so they can tweak and publish.
        """
        src = self.get_object()
        new_key = (request.data.get("new_key") or "").strip()
        new_name = (request.data.get("new_name") or "").strip()
        if not new_key or not new_name:
            return Response({"detail": "Nama dan key wajib diisi."}, status=400)
        if PermitType.objects.filter(key=new_key).exists():
            return Response({"detail": f"Key '{new_key}' sudah digunakan."}, status=409)

        with transaction.atomic():
            dup = PermitType.objects.create(
                sektor=src.sektor,
                key=new_key,
                name=new_name,
                description=src.description,
                sla_days=src.sla_days,
                product_name=src.product_name,
                legal_basis=src.legal_basis,
                fee_description=src.fee_description,
                complaint_info=src.complaint_info,
                is_berusaha=src.is_berusaha,
                oss_covered=src.oss_covered,
                is_published=False,
                schema_version=1,
            )
            WorkflowStage.objects.bulk_create(
                [
                    WorkflowStage(
                        permit_type=dup, **{f: getattr(s, f) for f in _STAGE_RESTORE_FIELDS}
                    )
                    for s in src.stages.all()
                ]
            )
            FormField.objects.bulk_create(
                [
                    FormField(permit_type=dup, **{f: getattr(x, f) for f in _FIELD_RESTORE_FIELDS})
                    for x in src.form_fields.all()
                ]
            )
            DocumentRequirement.objects.bulk_create(
                [
                    DocumentRequirement(
                        permit_type=dup, **{f: getattr(d, f) for f in _DOC_RESTORE_FIELDS}
                    )
                    for d in src.doc_requirements.all()
                ]
            )
        return Response(PermitTypeDetailSerializer(dup).data, status=201)

    @action(detail=True, methods=["get"], url_path="versions")
    def versions(self, request, key=None):
        """Read-only version timeline for this izin (F9)."""
        pt = self.get_object()
        return Response(PermitTypeVersionSerializer(pt.versions.all(), many=True).data)

    @action(detail=True, methods=["post"], url_path="versions/(?P<version>[0-9]+)/rollback")
    def rollback(self, request, key=None, version=None):
        """Restore this izin's schema from an archived version (F9)."""
        pt = self.get_object()
        try:
            archived = pt.versions.get(version=int(version))
        except PermitTypeVersion.DoesNotExist:
            return Response({"detail": "Versi tidak ditemukan."}, status=404)

        _restore_from_snapshot(pt, archived.snapshot)
        _checkpoint_version(pt, note=f"Rollback dari v{version}", user=request.user)
        return Response(PermitTypeDetailSerializer(pt).data)


class AdminStageViewSet(viewsets.ModelViewSet):
    """Admin CRUD for WorkflowStage within an izin."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = WorkflowStageSerializer

    def get_queryset(self):
        permit_key = self.kwargs.get("permit_key")
        return WorkflowStage.objects.filter(permit_type__key=permit_key).order_by("order")

    def perform_create(self, serializer):
        permit = PermitType.objects.get(key=self.kwargs["permit_key"])
        order = serializer.validated_data.get("order")
        if not order:
            order = _next_order(WorkflowStage, permit)
        serializer.save(permit_type=permit, order=order)
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
        _apply_reorder(WorkflowStage, request.data)
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
        order = serializer.validated_data.get("order")
        if not order:
            order = _next_order(FormField, permit)
        serializer.save(permit_type=permit, order=order)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    def perform_update(self, serializer):
        serializer.save()
        permit = serializer.instance.permit_type
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, permit_key=None):
        _apply_reorder(FormField, request.data)
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
        order = serializer.validated_data.get("order")
        if not order:
            order = _next_order(DocumentRequirement, permit)
        serializer.save(permit_type=permit, order=order)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    def perform_update(self, serializer):
        serializer.save()
        permit = serializer.instance.permit_type
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, permit_key=None):
        _apply_reorder(DocumentRequirement, request.data)
        permit = PermitType.objects.get(key=permit_key)
        permit.schema_version += 1
        permit.save(update_fields=["schema_version"])
        return Response({"detail": "Urutan persyaratan diperbarui."})
