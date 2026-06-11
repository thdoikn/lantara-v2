from rest_framework import serializers

from .models import (
    DocumentRequirement,
    FormField,
    PermitType,
    Sektor,
    WorkflowStage,
)


class WorkflowStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStage
        fields = [
            "id", "key", "order", "name", "stage_type", "actor_role",
            "sla_hours", "requires_site_visit", "allowed_actions",
            "is_terminal", "instructions",
        ]


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormField
        fields = [
            "id", "key", "label", "field_type", "section", "order",
            "required", "validation_json", "options_json",
            "prefill_from_profile", "help_text_field", "placeholder",
        ]


class DocumentRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRequirement
        fields = [
            "id", "key", "title", "description", "allowed_types",
            "max_bytes", "required", "order",
            "conditional_field_key", "conditional_field_value",
        ]


class PermitTypeListSerializer(serializers.ModelSerializer):
    sektor_name = serializers.CharField(source="sektor.name", read_only=True)
    sektor_key = serializers.CharField(source="sektor.key", read_only=True)

    class Meta:
        model = PermitType
        fields = [
            "id", "key", "name", "sektor_key", "sektor_name",
            "is_berusaha", "oss_covered", "sla_days", "product_name",
            "fee_description", "is_published", "schema_version",
        ]


class PermitTypeDetailSerializer(serializers.ModelSerializer):
    sektor_name = serializers.CharField(source="sektor.name", read_only=True)
    sektor_key = serializers.CharField(source="sektor.key", read_only=True)
    stages = WorkflowStageSerializer(many=True, read_only=True)
    form_fields = FormFieldSerializer(many=True, read_only=True)
    doc_requirements = DocumentRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = PermitType
        fields = [
            "id", "key", "name", "description",
            "sektor_key", "sektor_name",
            "is_berusaha", "oss_covered", "oss_deeplink",
            "sla_days", "product_name", "legal_basis",
            "fee_description", "complaint_info",
            "is_published", "schema_version",
            "stages", "form_fields", "doc_requirements",
        ]


class SektorSerializer(serializers.ModelSerializer):
    permit_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sektor
        fields = [
            "id", "key", "name", "description", "icon",
            "order", "is_active", "is_catchall", "pengampu", "permit_count",
        ]


class SektorDetailSerializer(serializers.ModelSerializer):
    permit_types = PermitTypeListSerializer(many=True, read_only=True)

    class Meta:
        model = Sektor
        fields = [
            "id", "key", "name", "description", "icon",
            "order", "is_active", "is_catchall", "pengampu", "permit_types",
        ]
