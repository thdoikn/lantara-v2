from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSuperAdmin
from .models import PermitType, Sektor
from .serializers import (
    PermitTypeDetailSerializer,
    PermitTypeListSerializer,
    SektorDetailSerializer,
    SektorSerializer,
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
