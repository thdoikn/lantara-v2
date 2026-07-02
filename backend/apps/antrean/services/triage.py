"""Re-triage at check-in — Opsi A (planning doc §7.4).

Online citizens pick their own service, so mistakes happen. A counter officer can
correct the service when the citizen checks in:
  - same instansi  → keep the original take-time (no penalty for a small slip);
    just re-number under the new service and recompute the estimate.
  - different instansi → treat as a fresh check-in in the target service (new
    take-time, new number, fresh quota) — it is effectively a different line.
"""

from django.db import transaction
from django.utils import timezone

from .errors import InvalidTicketStateError
from .estimate import estimate_for
from .quota import assert_quota_available


@transaction.atomic
def retriage(ticket, target_layanan, actor=None):
    """Move a ticket to another service. Returns the updated ticket."""
    from apps.antrean.models import Ticket, TicketEvent

    from .numbering import next_seq_and_number

    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status not in (
        Ticket.Status.RESERVED,
        Ticket.Status.CHECKED_IN,
        Ticket.Status.IN_POOL,
    ):
        raise InvalidTicketStateError("Koreksi layanan hanya dapat dilakukan sebelum dipanggil.")
    if target_layanan.id == ticket.layanan_id:
        return ticket

    same_instansi = target_layanan.instansi_id == ticket.layanan.instansi_id
    service_date = ticket.service_date
    old_number = ticket.number

    assert_quota_available(target_layanan, service_date, ticket.channel)
    # Lock the target service's rows for safe numbering.
    list(
        Ticket.objects.select_for_update().filter(layanan=target_layanan, service_date=service_date)
    )
    seq, number = next_seq_and_number(target_layanan, service_date)

    ticket.layanan = target_layanan
    ticket.seq = seq
    ticket.number = number
    if not same_instansi:
        # Different instansi → recompute as a brand-new check-in.
        ticket.taken_at = timezone.now()
        ticket.is_demoted = False
        ticket.checkin_at = timezone.now()
    ticket.estimated_call_at = estimate_for(ticket)
    ticket.save(
        update_fields=[
            "layanan",
            "seq",
            "number",
            "taken_at",
            "is_demoted",
            "checkin_at",
            "estimated_call_at",
            "updated_at",
        ]
    )
    TicketEvent.objects.create(
        ticket=ticket,
        action=TicketEvent.Action.RETRIAGE,
        actor=actor,
        notes=(
            f"{old_number} → {number} "
            f"({'zona sama, waktu ambil dipertahankan' if same_instansi else 'beda instansi, dihitung ulang'})."
        ),
    )
    return ticket
