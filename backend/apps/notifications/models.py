"""
Notifications — in-app bell + email + WhatsApp (adapter).
Real-time delivery via Django Channels WebSocket.
"""

from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel


class Notification(TimestampedModel):
    class NotifType(models.TextChoices):
        SUBMISSION_SUBMITTED = "submission_submitted", "Pengajuan Diterima"
        STAGE_ADVANCED = "stage_advanced", "Tahap Berlanjut"
        REVISION_REQUESTED = "revision_requested", "Revisi Diminta"
        SUBMISSION_APPROVED = "submission_approved", "Izin Disetujui"
        SUBMISSION_REJECTED = "submission_rejected", "Izin Ditolak"
        PERMIT_PUBLISHED = "permit_published", "Izin Diterbitkan"
        SLA_AT_RISK = "sla_at_risk", "SLA Mendekati Batas"
        SLA_BREACHED = "sla_breached", "SLA Terlampaui"
        VISIT_SCHEDULED = "visit_scheduled", "Kunjungan Dijadwalkan"
        GENERAL = "general", "Umum"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notif_type = models.CharField(max_length=40, choices=NotifType.choices)
    title = models.CharField(max_length=200)
    body = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Optional link context
    submission_id = models.UUIDField(null=True, blank=True, db_index=True)
    action_url = models.CharField(max_length=500, blank=True)

    # Delivery tracking
    email_sent = models.BooleanField(default=False)
    whatsapp_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"Notif [{self.notif_type}] → {self.recipient.email}"
