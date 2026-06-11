from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel


class VisitTicket(TimestampedModel):
    """
    Records a site-visit scheduling ticket sent via WhatsApp.
    Created when a verifier schedules a site visit on a submission.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Menunggu Konfirmasi"
        CONFIRMED = "confirmed", "Dikonfirmasi"
        COMPLETED = "completed", "Selesai"
        CANCELLED = "cancelled", "Dibatalkan"

    submission = models.ForeignKey(
        "submissions.Submission",
        on_delete=models.CASCADE,
        related_name="visit_tickets",
    )
    scheduled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scheduled_visits",
    )
    scheduled_at = models.DateTimeField()
    location_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    wa_message_sent = models.BooleanField(default=False)
    wa_sent_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-scheduled_at"]

    def __str__(self):
        return f"VisitTicket {self.submission.reference_number} @ {self.scheduled_at}"
