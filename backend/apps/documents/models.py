"""
Documents — uploaded files per submission document requirement.
Validation (type, size, virus scan) runs async via Celery.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel


class UploadedDocument(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Menunggu Validasi"
        VALID = "valid", "Valid"
        INVALID = "invalid", "Tidak Valid"
        INFECTED = "infected", "Terdeteksi Malware"

    submission = models.ForeignKey(
        "submissions.Submission",
        on_delete=models.CASCADE,
        related_name="uploaded_documents",
    )
    requirement_key = models.CharField(max_length=120, db_index=True)
    requirement_title = models.CharField(max_length=300, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_documents",
    )

    file = models.FileField(upload_to="submissions/documents/")
    original_filename = models.CharField(max_length=300)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    validation_error = models.TextField(blank=True)

    # Marks the currently-active version of this requirement upload
    is_active = models.BooleanField(default=True)

    # For revision: track which revision round this was uploaded in
    revision_round = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["submission", "requirement_key"]),
            models.Index(fields=["submission", "is_active"]),
        ]

    def __str__(self):
        return f"{self.submission} — {self.requirement_key} ({self.original_filename})"
