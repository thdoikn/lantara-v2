"""Estimated call time — the core feature of a virtual queue (planning doc §2.1).

Approximate by design and recalibrated continuously by a Celery sweep:
  estimate ~ now + tickets_ahead x per_ticket_minutes
where per_ticket_minutes = effective service minutes / open lokets serving it.
Effective service minutes = rolling mean of actual service time today, falling
back to the configured ``avg_minutes``.
"""

from datetime import timedelta

from django.db.models import Avg, F
from django.utils import timezone


def effective_service_minutes(layanan) -> float:
    """Rolling mean of (served_at - serving_at) for today's served tickets,
    fallback to the configured average."""
    from apps.antrean.models import Ticket

    today = timezone.localtime().date()
    rows = Ticket.objects.filter(
        layanan=layanan,
        service_date=today,
        status=Ticket.Status.SERVED,
        serving_at__isnull=False,
        served_at__isnull=False,
    ).aggregate(avg=Avg(F("served_at") - F("serving_at")))
    avg = rows["avg"]
    if avg:
        return max(1.0, avg.total_seconds() / 60.0)
    return float(layanan.avg_minutes or 10)


def open_loket_count(layanan) -> int:
    return max(1, layanan.loket.filter(is_open=True).count())


def estimate_for(ticket, ahead: int | None = None):
    """Compute estimated_call_at for a ticket given how many are ahead."""
    from .ordering import position_ahead

    if ahead is None:
        ahead = position_ahead(ticket)
    per_ticket = effective_service_minutes(ticket.layanan) / open_loket_count(ticket.layanan)
    return timezone.now() + timedelta(minutes=ahead * per_ticket)
