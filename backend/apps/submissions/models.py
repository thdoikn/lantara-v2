"""
Submissions — generic lifecycle engine-driven by WorkflowStage data.

Key invariants:
  - form_data is a JSONField validated against PermitType.form_fields at submit time.
  - On submit, schema_version_snapshot is set from PermitType.schema_version
    and never changes, so in-flight submissions are immutable to live edits.
  - current_stage_key is the FK into WorkflowStage.key for the active stage.
  - SLA is computed from working-days calendar (Holiday + weekends).
"""

from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel, UUIDModel
from apps.engine.models import PermitType


def _ref_number(sektor_key: str, izin_key: str) -> str:
    from datetime import date
    year = date.today().year
    seq = Submission.objects.filter(
        permit_type__sektor__key=sektor_key,
        permit_type__key=izin_key,
        created_at__year=year,
    ).count() + 1
    return f"LANTARA/{sektor_key.upper()}/{izin_key.upper()}/{year}/{seq:04d}"


class Submission(TimestampedModel):
    """
    One permit application. form_data holds all field answers as JSON;
    never use per-type tables.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draf"
        SUBMITTED = "submitted", "Diajukan"
        IN_REVIEW = "in_review", "Sedang Diverifikasi"
        REVISION = "revision", "Perlu Revisi"
        APPROVED = "approved", "Disetujui"
        REJECTED = "rejected", "Ditolak"
        PUBLISHING = "publishing", "Penerbitan"
        COLLECTION = "collection", "Siap Diambil"
        COLLECTED = "collected", "Selesai"

    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="submissions",
    )
    permit_type = models.ForeignKey(
        PermitType, on_delete=models.PROTECT, related_name="submissions"
    )

    # Reference number: LANTARA/{sektor}/{izin}/{YYYY}/{seq}
    reference_number = models.CharField(max_length=100, unique=True, blank=True)

    # Snapshot of schema version at submit time — immutable
    schema_version_snapshot = models.PositiveIntegerField(null=True, blank=True)
    # Full schema snapshot JSON (stage+field+requirement at submit time)
    schema_snapshot = models.JSONField(null=True, blank=True)

    # The actual applicant answers
    form_data = models.JSONField(default=dict)

    # Workflow state
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    current_stage_key = models.CharField(max_length=120, blank=True)
    current_stage_order = models.PositiveSmallIntegerField(default=0)

    # SLA
    submitted_at = models.DateTimeField(null=True, blank=True)
    sla_due_at = models.DateTimeField(null=True, blank=True)
    stage_entered_at = models.DateTimeField(null=True, blank=True)
    stage_sla_due_at = models.DateTimeField(null=True, blank=True)
    is_sla_breached = models.BooleanField(default=False)
    is_sla_at_risk = models.BooleanField(default=False)

    # Rejection
    rejection_reason = models.TextField(blank=True)

    # Who last acted (for queue filtering)
    last_actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="last_acted_submissions",
    )
    last_acted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["applicant", "status"]),
            models.Index(fields=["permit_type", "status"]),
            models.Index(fields=["current_stage_key"]),
            models.Index(fields=["sla_due_at"]),
        ]

    def __str__(self):
        return self.reference_number or str(self.id)

    def save(self, *args, **kwargs):
        if not self.reference_number and self.permit_type_id:
            self.reference_number = _ref_number(
                self.permit_type.sektor.key, self.permit_type.key
            )
        super().save(*args, **kwargs)


class SubmissionRevisionField(UUIDModel):
    """Tracks which specific fields/docs are flagged for revision."""

    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="revision_fields"
    )
    field_key = models.CharField(max_length=120)
    is_doc_requirement = models.BooleanField(default=False)
    note = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.submission} → {self.field_key}"


class SiteVisit(TimestampedModel):
    """Kunjungan lapangan — scheduled as part of verification stage."""

    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="site_visits"
    )
    stage_key = models.CharField(max_length=120)
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    officers = models.TextField(blank=True, help_text="Comma-separated officer names/NIPs")
    findings = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Kunjungan {self.submission} — {self.scheduled_date}"


class AuditEntry(UUIDModel):
    """
    Immutable audit log. One row per state/stage change.
    Rendered as the visual timeline for applicants (fixes v1 #7).
    """

    class ActionType(models.TextChoices):
        SUBMIT = "submit", "Diajukan"
        ADVANCE = "advance", "Lanjut Tahap"
        APPROVE = "approve", "Disetujui"
        REVISE = "revise", "Revisi Diminta"
        REJECT = "reject", "Ditolak"
        RESUBMIT = "resubmit", "Revisi Dikirim"
        GENERATE = "generate", "Draf Diterbitkan"
        SIGN = "sign", "Ditandatangani"
        PUBLISH = "publish", "Izin Diterbitkan"
        COLLECT = "collect", "Diambil"
        VISIT_SCHEDULED = "visit_scheduled", "Kunjungan Dijadwalkan"
        VISIT_COMPLETED = "visit_completed", "Kunjungan Selesai"
        COMMENT = "comment", "Catatan"

    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="audit_entries"
    )
    action = models.CharField(max_length=30, choices=ActionType.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    is_applicant_action = models.BooleanField(default=False)
    from_stage_key = models.CharField(max_length=120, blank=True)
    to_stage_key = models.CharField(max_length=120, blank=True)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.submission} — {self.action} at {self.created_at:%Y-%m-%d %H:%M}"


class SubmissionIndex(UUIDModel):
    """
    Denormalized index for fast list/filter/export queries.
    Updated on every submission status change via signal.
    """

    submission = models.OneToOneField(
        Submission, on_delete=models.CASCADE, related_name="index"
    )
    applicant_email = models.EmailField(db_index=True)
    applicant_name = models.CharField(max_length=200)
    sektor_key = models.CharField(max_length=80, db_index=True)
    sektor_name = models.CharField(max_length=200)
    izin_key = models.CharField(max_length=120, db_index=True)
    izin_name = models.CharField(max_length=300)
    reference_number = models.CharField(max_length=100, db_index=True)
    status = models.CharField(max_length=30, db_index=True)
    current_stage_key = models.CharField(max_length=120, blank=True)
    sla_due_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_sla_breached = models.BooleanField(default=False, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(db_index=True)
    updated_at = models.DateTimeField()

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["sektor_key", "status"]),
            models.Index(fields=["izin_key", "status"]),
            models.Index(fields=["is_sla_breached", "status"]),
        ]
