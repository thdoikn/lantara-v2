from rest_framework import serializers

from .models import IssuedPermit


class IssuedPermitPublicSerializer(serializers.ModelSerializer):
    """Public info returned by QR validation endpoint — no login required."""

    permit_type_name = serializers.CharField(source="submission.permit_type.name")
    sektor_name = serializers.CharField(source="submission.permit_type.sektor.name")
    applicant_name = serializers.CharField(source="submission.applicant.full_name")
    reference_number = serializers.CharField(source="submission.reference_number")

    class Meta:
        model = IssuedPermit
        fields = [
            "validation_uuid",
            "permit_type_name",
            "sektor_name",
            "applicant_name",
            "reference_number",
            "signatory_name",
            "signatory_title",
            "generation_status",
            "published_at",
        ]


class IssuedPermitDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssuedPermit
        fields = [
            "id",
            "validation_uuid",
            "generation_status",
            "signatory_name",
            "signatory_title",
            "signatory_nip",
            "signed_at",
            "published_at",
            "copy_recipients",
            "generation_task_id",
            "created_at",
        ]
