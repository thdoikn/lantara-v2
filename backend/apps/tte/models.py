"""
TTE (Tanda Tangan Elektronik) models — Phase 3.

BSSN/BSrE integration is dependency-gated (CLAUDE.md §9).
When FEATURE_TTE_ENABLED=true, the adapter tries the configured BSrE endpoint.
When false (default), a mock stamp is applied to the PDF.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel


class TTERequest(TimestampedModel):
    """Tracks a TTE signing request for a permit."""

    class Status(models.TextChoices):
        PENDING = "pending", "Menunggu"
        PROCESSING = "processing", "Diproses"
        SIGNED = "signed", "Ditandatangani"
        FAILED = "failed", "Gagal"
        MOCK = "mock", "Mock (Simulasi)"

    permit = models.OneToOneField(
        "permits.IssuedPermit",
        on_delete=models.CASCADE,
        related_name="tte_request",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    # BSrE transaction reference (null if mock)
    bsre_transaction_id = models.CharField(max_length=200, blank=True)
    # Signed PDF stored in MinIO (same bucket, different key)
    signed_pdf_key = models.CharField(max_length=500, blank=True)
    error_detail = models.TextField(blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    is_mock = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"TTE {self.permit_id} [{self.status}]"
