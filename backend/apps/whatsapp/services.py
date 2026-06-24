"""
WhatsApp visit ticket service.
Called by submissions action view when a verifier schedules a site visit.
"""

import logging
from datetime import datetime

from django.utils import timezone

logger = logging.getLogger(__name__)


def create_visit_ticket(submission, scheduled_by, scheduled_at: datetime, location_notes: str = ""):
    from .adapter import send_whatsapp_message
    from .models import VisitTicket

    ticket = VisitTicket.objects.create(
        submission=submission,
        scheduled_by=scheduled_by,
        scheduled_at=scheduled_at,
        location_notes=location_notes,
    )

    applicant = submission.applicant
    number = getattr(applicant, "whatsapp_number", "") or getattr(applicant, "phone", "")
    if number:
        dt_str = scheduled_at.strftime("%d %B %Y pukul %H:%M")
        msg = (
            f"*Kunjungan Lapangan Dijadwalkan*\n\n"
            f"Nomor Permohonan: {submission.reference_number}\n"
            f"Jadwal: {dt_str}\n"
            f"Lokasi: {location_notes or 'akan dikonfirmasi'}\n\n"
            f"Harap pastikan lokasi dapat diakses pada waktu yang ditentukan.\n"
            f"Info lebih lanjut: https://lantara.id/portal/submissions/{submission.id}"
        )
        sent = send_whatsapp_message(number, msg)
        if sent:
            ticket.wa_message_sent = True
            ticket.wa_sent_at = timezone.now()
            ticket.save(update_fields=["wa_message_sent", "wa_sent_at"])

    return ticket
