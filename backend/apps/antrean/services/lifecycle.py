"""Ticket lifecycle — issue, call, recall, serve, complete, no-show, cancel.

State changes that race (issuing under quota, calling the pool head) run inside a
transaction with row locks. The collection-stage seam fires here: completing a
ticket that is linked to an izin submission advances that submission to collected
— importing submissions from antrean is the allowed direction (never the reverse).
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.antrean.models import ACTIVE_TICKET_STATUSES

from .errors import DuplicateActiveTicketError, InvalidTicketStateError, OutsideOperatingWindowError
from .estimate import estimate_for
from .params import get_param
from .quota import assert_quota_available
from .working_hours import take_number_open


def _notify(recipient, notif_type, title, body, action_url="", send_whatsapp=False):
    if recipient is None:
        return
    from apps.notifications.utils import send_notification

    send_notification(
        recipient=recipient,
        notif_type=notif_type,
        title=title,
        body=body,
        action_url=action_url,
        send_email=False,
        send_whatsapp=send_whatsapp,
    )


@transaction.atomic
def take_ticket(
    layanan,
    channel,
    *,
    applicant=None,
    submission=None,
    is_priority=False,
    holder_name="",
    holder_phone="",
    actor=None,
):
    """Issue a new ticket. Enforces operating window, the rigid 60/40 quota, and
    one-active-ticket-per-service-per-day. Online tickets start reserved; walk-in
    tickets are auto-checked-in into the pool."""
    from apps.antrean.models import Ticket, TicketEvent

    from .numbering import next_seq_and_number

    now = timezone.now()
    service_date = timezone.localtime(now).date()

    if not take_number_open(now, layanan):
        raise OutsideOperatingWindowError(
            "Pengambilan nomor sedang ditutup (di luar jam operasional atau telah cut-off)."
        )

    # Lock today's rows for this service so numbering + quota are race-free.
    locked = list(
        Ticket.objects.select_for_update().filter(layanan=layanan, service_date=service_date)
    )
    if applicant is not None:
        already = [
            t
            for t in locked
            if t.applicant_id == applicant.id and t.status in ACTIVE_TICKET_STATUSES
        ]
        if already:
            raise DuplicateActiveTicketError(
                "Anda sudah memiliki nomor aktif untuk layanan ini hari ini."
            )

    assert_quota_available(layanan, service_date, channel)
    seq, number = next_seq_and_number(layanan, service_date)

    walkin = channel == Ticket.Channel.WALKIN
    ticket = Ticket(
        layanan=layanan,
        service_date=service_date,
        channel=channel,
        number=number,
        seq=seq,
        status=Ticket.Status.IN_POOL if walkin else Ticket.Status.RESERVED,
        is_priority=is_priority,
        taken_at=now,
        checkin_at=now if walkin else None,
        applicant=applicant,
        submission=submission,
        holder_name=holder_name,
        holder_phone=holder_phone,
    )
    ticket.estimated_call_at = estimate_for(ticket, ahead=None if walkin else seq - 1)

    # Online check-in deadline: window_min before the estimate.
    if not walkin and ticket.estimated_call_at:
        window_min = get_param("checkin_window_min", layanan)
        ticket.checkin_deadline = ticket.estimated_call_at - timedelta(minutes=window_min)

    ticket.save()
    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.TAKE,
        actor=actor or applicant,
        to_status=ticket.status,
    )

    _notify(
        applicant,
        "antrean_ticket_taken",
        f"Nomor antrean {number}",
        _taken_body(ticket),
        action_url=_ticket_url(ticket),
    )
    return ticket


def _taken_body(ticket) -> str:
    est = (
        timezone.localtime(ticket.estimated_call_at).strftime("%H:%M")
        if ticket.estimated_call_at
        else "-"
    )
    if ticket.channel == ticket.Channel.ONLINE:
        return (
            f"Nomor Anda {ticket.number}. Estimasi panggil pukul {est}. "
            "Lakukan check-in di MPP sebelum gilirannya tiba."
        )
    return f"Nomor Anda {ticket.number}. Estimasi panggil pukul {est}."


def _ticket_url(ticket) -> str:
    if ticket.submission_id:
        return f"/portal/submissions/{ticket.submission_id}/antrean"
    return f"/antrean/tiket/{ticket.id}"


@transaction.atomic
def call_next(loket, operator):
    """Call the next ticket from the loket's pool. Returns the ticket or None."""
    from apps.antrean.models import Ticket, TicketEvent

    from .ordering import pick_next

    if not loket.is_open:
        raise InvalidTicketStateError("Loket belum dibuka.")

    candidate = pick_next(loket, timezone.localtime().date())
    if candidate is None:
        return None

    ticket = Ticket.objects.select_for_update().get(pk=candidate.pk)
    if ticket.status != Ticket.Status.IN_POOL:
        # Lost a race to another loket; caller may retry.
        return None

    from_status = ticket.status
    ticket.status = Ticket.Status.CALLED
    ticket.called_at = timezone.now()
    ticket.loket = loket
    ticket.recall_count = 0
    ticket.save(update_fields=["status", "called_at", "loket", "recall_count", "updated_at"])

    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.CALL,
        actor=operator,
        from_status=from_status,
        to_status=ticket.status,
        loket=loket,
    )
    _notify(
        ticket.applicant,
        "antrean_called",
        f"Giliran Anda — {ticket.number}",
        f"Silakan menuju {loket.code}. Nomor {ticket.number} dipanggil.",
        action_url=_ticket_url(ticket),
        send_whatsapp=True,
    )
    _push_realtime(ticket)
    return ticket


@transaction.atomic
def recall(ticket, operator):
    """Re-announce a called ticket. After recall_max, eligible for no-show."""
    from apps.antrean.models import Ticket, TicketEvent

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status != Ticket.Status.CALLED:
        raise InvalidTicketStateError("Hanya nomor yang sedang dipanggil dapat dipanggil ulang.")
    ticket.recall_count = (ticket.recall_count or 0) + 1
    ticket.called_at = timezone.now()
    ticket.save(update_fields=["recall_count", "called_at", "updated_at"])
    TicketEvent.objects.create(
        ticket=ticket, action=TicketEvent.Action.RECALL, actor=operator, loket=ticket.loket
    )
    _notify(
        ticket.applicant,
        "antrean_called",
        f"Panggilan ulang — {ticket.number}",
        f"Silakan menuju {ticket.loket.code if ticket.loket_id else 'loket'}.",
        action_url=_ticket_url(ticket),
    )
    return ticket


@transaction.atomic
def start_serving(ticket, operator):
    from apps.antrean.models import Ticket, TicketEvent

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status != Ticket.Status.CALLED:
        raise InvalidTicketStateError("Nomor belum dipanggil.")
    from_status = ticket.status
    ticket.status = Ticket.Status.SERVING
    ticket.serving_at = timezone.now()
    ticket.served_by = operator
    if operator and ticket.loket_id is None:
        ticket.loket = operator.operating_loket.first()
    ticket.save(update_fields=["status", "serving_at", "served_by", "loket", "updated_at"])
    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.SERVE,
        actor=operator,
        from_status=from_status,
        to_status=ticket.status,
        loket=ticket.loket,
    )
    _push_realtime(ticket)
    return ticket


@transaction.atomic
def complete(ticket, operator):
    """Finish service. If linked to an izin submission at its collection stage,
    advance that submission to collected (the engine seam, antrean→submissions)."""
    from apps.antrean.models import Ticket, TicketEvent

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status not in (Ticket.Status.SERVING, Ticket.Status.CALLED):
        raise InvalidTicketStateError("Nomor belum dalam pelayanan.")
    from_status = ticket.status
    now = timezone.now()
    ticket.status = Ticket.Status.SERVED
    ticket.served_at = now
    if ticket.serving_at is None:
        ticket.serving_at = now
    if operator:
        ticket.served_by = operator
    ticket.save(update_fields=["status", "served_at", "serving_at", "served_by", "updated_at"])
    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.COMPLETE,
        actor=operator,
        from_status=from_status,
        to_status=ticket.status,
        loket=ticket.loket,
    )

    if ticket.submission_id:
        _advance_linked_submission(ticket, operator)

    _push_realtime(ticket)
    return ticket


def _advance_linked_submission(ticket, operator):
    """Best-effort: mark the linked submission collected. Never let a submissions
    hiccup roll back a completed in-person service."""
    from apps.submissions.models import Submission

    sub = ticket.submission
    if sub is None or sub.status != Submission.Status.COLLECTION:
        return
    try:
        from apps.submissions.services import mark_collected

        mark_collected(sub, actor=operator, notes=f"Diambil di MPP (antrean {ticket.number}).")
    except Exception:
        pass


@transaction.atomic
def no_show(ticket, operator=None, reason="no_show"):
    """Void a ticket whose holder never appeared. No account sanction (§7.2)."""
    from apps.antrean.models import Ticket, TicketEvent

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status not in (Ticket.Status.CALLED, Ticket.Status.RESERVED, Ticket.Status.IN_POOL):
        raise InvalidTicketStateError("Nomor tidak dapat ditandai tidak hadir dari status ini.")
    from_status = ticket.status
    is_expired = reason == "expired"
    ticket.status = Ticket.Status.EXPIRED if is_expired else Ticket.Status.NO_SHOW
    ticket.save(update_fields=["status", "updated_at"])
    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.EXPIRE if is_expired else TicketEvent.Action.NO_SHOW,
        actor=operator,
        from_status=from_status,
        to_status=ticket.status,
        loket=ticket.loket,
    )
    _notify(
        ticket.applicant,
        "antrean_no_show",
        f"Nomor {ticket.number} hangus",
        "Nomor antrean Anda hangus karena tidak hadir. Anda bebas mengambil nomor baru.",
        action_url=_ticket_url(ticket),
    )
    _push_realtime(ticket)
    return ticket


@transaction.atomic
def cancel(ticket, actor=None):
    """Citizen cancels a ticket they no longer need (before being called)."""
    from apps.antrean.models import Ticket, TicketEvent

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status not in (Ticket.Status.RESERVED, Ticket.Status.IN_POOL):
        raise InvalidTicketStateError("Nomor tidak dapat dibatalkan pada status ini.")
    from_status = ticket.status
    ticket.status = Ticket.Status.CANCELLED
    ticket.save(update_fields=["status", "updated_at"])
    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.CANCEL,
        actor=actor,
        from_status=from_status,
        to_status=ticket.status,
    )
    _push_realtime(ticket)
    return ticket


def _push_realtime(ticket):
    from .realtime import push_board_update, push_ticket_update

    push_ticket_update(ticket)
    push_board_update(ticket.layanan.instansi_id)
