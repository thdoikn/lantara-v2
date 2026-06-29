"""Check-in — the gate into the calling pool (planning doc §2.2, §6).

Online tickets are issued ``reserved`` and only enter the pool on check-in.
Walk-in tickets are checked in automatically at issue (they're already present).

Window rule: an online ticket that checks in at least ``checkin_window_min``
before its estimate keeps its guaranteed slot; one that checks in later is not
voided — it enters the pool demoted, ordered by its actual check-in time.
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .errors import InvalidTicketStateError
from .params import get_param


@transaction.atomic
def check_in(ticket, actor=None):
    """Move a reserved online ticket into the calling pool. Returns the ticket."""
    from apps.antrean.models import Ticket, TicketEvent

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status != Ticket.Status.RESERVED:
        raise InvalidTicketStateError("Nomor ini tidak dalam status menunggu check-in.")

    now = timezone.now()
    from_status = ticket.status
    ticket.checkin_at = now

    # Demote if the check-in window has already closed (within window_min of the
    # estimate). The ticket is still served — it just loses the right to jump
    # ahead of walk-ins who arrived earlier.
    window_min = get_param("checkin_window_min", ticket.layanan)
    demoted = False
    if ticket.estimated_call_at:
        window_close = ticket.estimated_call_at - timedelta(minutes=window_min)
        demoted = now > window_close
    ticket.is_demoted = demoted
    ticket.status = Ticket.Status.IN_POOL
    ticket.save(update_fields=["checkin_at", "is_demoted", "status", "updated_at"])

    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.DEMOTE if demoted else TicketEvent.Action.CHECK_IN,
        actor=actor,
        from_status=from_status,
        to_status=ticket.status,
        notes="Check-in lewat jendela — posisi diturunkan." if demoted else "",
    )
    return ticket
