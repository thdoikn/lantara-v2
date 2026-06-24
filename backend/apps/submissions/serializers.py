from rest_framework import serializers

from apps.engine.serializers import PermitTypeListSerializer

from .models import AuditEntry, SiteVisit, Submission, SubmissionRevisionField


class AuditEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditEntry
        fields = [
            "id",
            "action",
            "actor_name",
            "is_applicant_action",
            "from_stage_key",
            "to_stage_key",
            "from_status",
            "to_status",
            "notes",
            "created_at",
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.full_name
        return "Sistem"


class RevisionFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionRevisionField
        fields = ["id", "field_key", "is_doc_requirement", "note", "is_resolved"]


class SiteVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteVisit
        fields = [
            "id",
            "stage_key",
            "scheduled_date",
            "scheduled_time",
            "officers",
            "findings",
            "is_completed",
            "completed_at",
        ]


class SubmissionListSerializer(serializers.ModelSerializer):
    permit_type_name = serializers.CharField(source="permit_type.name", read_only=True)
    sektor_name = serializers.CharField(source="permit_type.sektor.name", read_only=True)
    sektor_key = serializers.CharField(source="permit_type.sektor.key", read_only=True)
    applicant_name = serializers.CharField(source="applicant.full_name", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "reference_number",
            "status",
            "permit_type_name",
            "sektor_name",
            "sektor_key",
            "applicant_name",
            "current_stage_key",
            "sla_due_at",
            "is_sla_breached",
            "is_sla_at_risk",
            "submitted_at",
            "created_at",
        ]


class SubmissionDetailSerializer(serializers.ModelSerializer):
    permit_type = PermitTypeListSerializer(read_only=True)
    applicant_name = serializers.CharField(source="applicant.full_name", read_only=True)
    applicant_email = serializers.CharField(source="applicant.email", read_only=True)
    audit_entries = AuditEntrySerializer(many=True, read_only=True)
    revision_fields = RevisionFieldSerializer(many=True, read_only=True)
    site_visits = SiteVisitSerializer(many=True, read_only=True)
    issued_permit_id = serializers.SerializerMethodField()
    issued_permit_validation_uuid = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            "id",
            "reference_number",
            "status",
            "permit_type",
            "applicant_name",
            "applicant_email",
            "form_data",
            "schema_version_snapshot",
            "schema_snapshot",
            "current_stage_key",
            "current_stage_order",
            "sla_due_at",
            "is_sla_breached",
            "is_sla_at_risk",
            "stage_sla_due_at",
            "submitted_at",
            "rejection_reason",
            "issued_permit_id",
            "issued_permit_validation_uuid",
            "created_at",
            "updated_at",
            "audit_entries",
            "revision_fields",
            "site_visits",
        ]

    def get_issued_permit_id(self, obj):
        try:
            return str(obj.issued_permit.id)
        except Exception:
            return None

    def get_issued_permit_validation_uuid(self, obj):
        try:
            return str(obj.issued_permit.validation_uuid)
        except Exception:
            return None


class SubmissionCreateSerializer(serializers.Serializer):
    permit_type_key = serializers.SlugField()
    form_data = serializers.DictField()

    def validate(self, data):
        from apps.engine.models import PermitType

        try:
            pt = PermitType.objects.prefetch_related("form_fields").get(
                key=data["permit_type_key"], is_published=True
            )
        except PermitType.DoesNotExist:
            raise serializers.ValidationError(
                {"permit_type_key": "Izin tidak ditemukan atau belum diterbitkan."}
            )

        # Validate required form fields
        form_data = data["form_data"]
        errors = {}
        for field in pt.form_fields.filter(required=True):
            val = form_data.get(field.key)
            if val is None or val == "":
                errors[field.key] = f"{field.label} wajib diisi."
        if errors:
            raise serializers.ValidationError({"form_data": errors})

        data["_permit_type"] = pt
        return data


class SubmissionActionSerializer(serializers.Serializer):
    """Used for approve/revise/reject actions by verifier."""

    class Action(serializers.ChoiceField):
        pass

    action = serializers.ChoiceField(
        choices=[
            "approve",
            "revise",
            "request_revision",
            "reject",
            "advance",
            "schedule_site_visit",
        ]
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    revision_fields = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
