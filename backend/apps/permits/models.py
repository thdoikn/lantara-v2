"""
Permits — issued permit documents with QR validation UUID.
"""
import uuid

from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel


class IssuedPermit(TimestampedModel):
    class GenerationStatus(models.TextChoices):
        PENDING = "pending", "Menunggu"
        DRAFT = "draft", "Draf"
        SIGNED = "signed", "Ditandatangani"
        PUBLISHED = "published", "Diterbitkan"

    submission = models.OneToOneField(
        "submissions.Submission",
        on_delete=models.PROTECT,
        related_name="issued_permit",
    )
    # Public validation UUID (embedded in QR code)
    validation_uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)

    generation_status = models.CharField(
        max_length=20, choices=GenerationStatus.choices, default=GenerationStatus.PENDING
    )

    # PDF file (generated async via Celery, stored in MinIO)
    pdf_file = models.FileField(upload_to="permits/pdf/", null=True, blank=True)
    draft_pdf_file = models.FileField(upload_to="permits/drafts/", null=True, blank=True)

    # Signatories
    signatory_name = models.CharField(max_length=200, blank=True)
    signatory_title = models.CharField(max_length=200, blank=True)
    signatory_nip = models.CharField(max_length=30, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)

    # Additional copy recipients (tembusans)
    copy_recipients = models.JSONField(default=list)

    published_at = models.DateTimeField(null=True, blank=True)

    # Celery task tracking
    generation_task_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Izin {self.submission.reference_number}"

    @property
    def validation_url(self):
        from django.conf import settings as _s
        base = getattr(_s, "FRONTEND_BASE_URL", "http://localhost")
        return f"{base}/validate/{self.validation_uuid}"
