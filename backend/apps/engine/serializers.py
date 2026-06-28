from rest_framework import serializers

from apps.reference.models import Direktorat

from .models import (
    DocumentRequirement,
    FormField,
    PermitType,
    PermitTypeVersion,
    Sektor,
    WorkflowStage,
)


class DirektoratLiteSerializer(serializers.ModelSerializer):
    kedeputian_name = serializers.CharField(source="kedeputian.name", read_only=True, default=None)

    class Meta:
        model = Direktorat
        fields = ["id", "key", "name", "kedeputian_name"]


class WorkflowStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStage
        # order is optional on create — the server assigns max+1 when omitted (F4).
        extra_kwargs = {"order": {"required": False}}
        fields = [
            "id",
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


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormField
        extra_kwargs = {"order": {"required": False}}
        fields = [
            "id",
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


class DocumentRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRequirement
        fields = [
            "id",
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


class PermitTypeListSerializer(serializers.ModelSerializer):
    sektor_name = serializers.CharField(source="sektor.name", read_only=True)
    sektor_key = serializers.CharField(source="sektor.key", read_only=True)
    is_publish_ready = serializers.SerializerMethodField()
    readiness_missing = serializers.SerializerMethodField()

    class Meta:
        model = PermitType
        fields = [
            "id",
            "key",
            "name",
            "sektor_key",
            "sektor_name",
            "is_berusaha",
            "oss_covered",
            "sla_days",
            "product_name",
            "fee_description",
            "is_published",
            "schema_version",
            "published_schema_version",
            "has_unpublished_changes",
            "is_publish_ready",
            "readiness_missing",
        ]

    def _readiness(self, obj) -> dict:
        from .readiness import publish_readiness_errors

        cache = getattr(obj, "_readiness_cache", None)
        if cache is None:
            cache = publish_readiness_errors(obj)
            obj._readiness_cache = cache
        return cache

    def get_is_publish_ready(self, obj) -> bool:
        return not self._readiness(obj)

    def get_readiness_missing(self, obj) -> list:
        return list(self._readiness(obj).values())


class PermitTypeVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True, default=None
    )

    class Meta:
        model = PermitTypeVersion
        fields = ["id", "version", "note", "created_by_name", "created_at"]


class PermitTypeDetailSerializer(serializers.ModelSerializer):
    sektor = serializers.SlugRelatedField(slug_field="key", queryset=Sektor.objects.all())
    sektor_name = serializers.CharField(source="sektor.name", read_only=True)
    sektor_key = serializers.CharField(source="sektor.key", read_only=True)
    stages = WorkflowStageSerializer(many=True, read_only=True)
    form_fields = FormFieldSerializer(many=True, read_only=True)
    doc_requirements = DocumentRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = PermitType
        fields = [
            "id",
            "key",
            "name",
            "description",
            "sektor",
            "sektor_key",
            "sektor_name",
            "is_berusaha",
            "oss_covered",
            "oss_deeplink",
            "sla_days",
            "product_name",
            "legal_basis",
            "fee_description",
            "complaint_info",
            "is_published",
            "schema_version",
            "published_schema_version",
            "has_unpublished_changes",
            "stages",
            "form_fields",
            "doc_requirements",
        ]


def _pengampu_display(obj) -> str:
    names = [d.name for d in obj.direktorats.all()]
    if names:
        return ", ".join(names)
    return obj.pengampu or ""


class SektorSerializer(serializers.ModelSerializer):
    permit_count = serializers.IntegerField(read_only=True)
    direktorats = DirektoratLiteSerializer(many=True, read_only=True)
    direktorat_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        required=False,
        source="direktorats",
        queryset=Direktorat.objects.all(),
    )
    pengampu_display = serializers.SerializerMethodField()

    class Meta:
        model = Sektor
        fields = [
            "id",
            "key",
            "name",
            "description",
            "icon",
            "order",
            "is_active",
            "is_catchall",
            "pengampu",
            "pengampu_display",
            "direktorats",
            "direktorat_ids",
            "permit_count",
        ]

    def get_pengampu_display(self, obj):
        return _pengampu_display(obj)


class SektorDetailSerializer(serializers.ModelSerializer):
    permit_types = PermitTypeListSerializer(many=True, read_only=True)
    direktorats = DirektoratLiteSerializer(many=True, read_only=True)
    pengampu_display = serializers.SerializerMethodField()

    class Meta:
        model = Sektor
        fields = [
            "id",
            "key",
            "name",
            "description",
            "icon",
            "order",
            "is_active",
            "is_catchall",
            "pengampu",
            "pengampu_display",
            "direktorats",
            "permit_types",
        ]

    def get_pengampu_display(self, obj):
        return _pengampu_display(obj)
