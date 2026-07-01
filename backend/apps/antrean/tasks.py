"""Antrean Celery tasks — estimate recompute, check-in expiry, no-show sweep, and
the 'tinggal X lagi' nudge. Registered in CELERY_BEAT_SCHEDULE (settings.base).

All run frequently (every minute) and only touch today's live tickets, so each
pass is cheap. Parameters (grace windows, threshold) are read from QueueParameter.
"""

from celery import shared_task


def _today():
    from django.utils import timezone

    return timezone.localtime().date()


@shared_task(bind=True, max_retries=2)
def generate_ticket_pdf(self, ticket_id: str, send_email: bool = True):
    """Render the ticket PDF (number + QR), store it to MinIO, and optionally
    email it to the ticket's delivery address."""
    from django.core.files.base import ContentFile

    from apps.antrean.models import Ticket

    from .email import send_ticket_email
    from .pdf import render_ticket_pdf

    try:
        ticket = Ticket.objects.select_related("layanan__instansi", "applicant").get(id=ticket_id)
    except Ticket.DoesNotExist:
        return
    try:
        pdf_bytes = render_ticket_pdf(ticket)
        ticket.pdf_file.save(
            f"tiket-{ticket.number}-{ticket.id}.pdf", ContentFile(pdf_bytes), save=True
        )
        if send_email and ticket.delivery_email:
            send_ticket_email(ticket)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=15)


@shared_task
def recompute_estimates():
    """Refresh estimated_call_at + check-in deadlines for live tickets and push
    live updates to anyone watching."""
    from datetime import timedelta

    from apps.antrean.models import Ticket

    from .services.estimate import estimate_for
    from .services.ordering import position_ahead
    from .services.params import get_param
    from .services.realtime import push_ticket_update

    tickets = Ticket.objects.filter(
        service_date=_today(),
        status__in=[Ticket.Status.RESERVED, Ticket.Status.IN_POOL],
    ).select_related("layanan")

    updated = 0
    for t in tickets:
        ahead = position_ahead(t) if t.status == Ticket.Status.IN_POOL else (t.seq - 1)
        t.estimated_call_at = estimate_for(t, ahead=ahead)
        fields = ["estimated_call_at", "updated_at"]
        if t.status == Ticket.Status.RESERVED and t.estimated_call_at:
            window_min = get_param("checkin_window_min", t.layanan)
            t.checkin_deadline = t.estimated_call_at - timedelta(minutes=window_min)
            fields.append("checkin_deadline")
        t.save(update_fields=fields)
        push_ticket_update(t, ahead=ahead if t.status == Ticket.Status.IN_POOL else None)
        updated += 1
    return f"recompute_estimates: {updated} ticket(s)."


@shared_task
def sweep_checkin_expiry():
    """Online tickets that never checked in by noshow_grace_min past their
    estimate are voided (planning doc §7.2 — no account sanction)."""
    from datetime import timedelta

    from django.utils import timezone

    from apps.antrean.models import Ticket

    from .services import lifecycle
    from .services.params import get_param

    now = timezone.now()
    expired = 0
    reserved = Ticket.objects.filter(
        service_date=_today(),
        status=Ticket.Status.RESERVED,
        estimated_call_at__isnull=False,
    ).select_related("layanan")
    for t in reserved:
        grace = get_param("noshow_grace_min", t.layanan)
        if now > t.estimated_call_at + timedelta(minutes=grace):
            lifecycle.no_show(t, operator=None, reason="expired")
            expired += 1
    return f"sweep_checkin_expiry: {expired} expired."


@shared_task
def sweep_no_show():
    """Called tickets whose holder never appeared — recalls exhausted and the
    recall interval has elapsed — are marked no-show."""
    from datetime import timedelta

    from django.utils import timezone

    from apps.antrean.models import Ticket

    from .services import lifecycle
    from .services.params import get_param

    now = timezone.now()
    swept = 0
    called = Ticket.objects.filter(
        service_date=_today(),
        status=Ticket.Status.CALLED,
        called_at__isnull=False,
    ).select_related("layanan")
    for t in called:
        interval = get_param("recall_interval_min", t.layanan)
        if t.recall_count >= (t.layanan.recall_max or 2) and now > t.called_at + timedelta(
            minutes=interval
        ):
            lifecycle.no_show(t, operator=None, reason="no_show")
            swept += 1
    return f"sweep_no_show: {swept} no-show."


@shared_task
def notify_position_threshold():
    """Send the 'tinggal X lagi' nudge once when a pooled ticket crosses the
    configured threshold (default 3 ahead). Deduped via last_notified_ahead."""
    from apps.antrean.models import Ticket
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    from .services.ordering import position_ahead
    from .services.params import get_param

    notified = 0
    pooled = Ticket.objects.filter(
        service_date=_today(),
        status=Ticket.Status.IN_POOL,
        applicant__isnull=False,
    ).select_related("layanan", "applicant")
    for t in pooled:
        threshold = get_param("position_notify_threshold", t.layanan)
        ahead = position_ahead(t)
        if ahead <= threshold and (t.last_notified_ahead is None or t.last_notified_ahead > ahead):
            send_notification(
                recipient=t.applicant,
                notif_type=Notification.NotifType.ANTREAN_ALMOST_TURN,
                title=f"Tinggal {ahead} nomor lagi",
                body=f"Nomor {t.number} hampir dipanggil. Mohon bersiap di area tunggu.",
                action_url=f"/antrean/tiket/{t.id}",
                send_email=False,
                send_whatsapp=True,
            )
            t.last_notified_ahead = ahead
            t.save(update_fields=["last_notified_ahead", "updated_at"])
            notified += 1
    return f"notify_position_threshold: {notified} notified."
