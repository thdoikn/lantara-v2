"""Hybrid-guaranteed ordering + priority interleaving (planning doc §2.2, §7.3).

The calling pool = tickets that are present and ready (status IN_POOL). They are
ordered by ``effective_time``:
  - on-time online + walk-in keep ``taken_at`` (their guaranteed slot — they may
    "menyalip" walk-ins who arrived later);
  - online tickets that missed the check-in window are demoted to ``checkin_at``.

Priority tickets (lansia/disabilitas/ibu hamil/balita) are interleaved 1 : N
regular (default 1:3) so vulnerable citizens are served quickly without starving
the regular line.
"""


def _eff_key(t):
    return (t.effective_time, t.seq)


def pool_for_loket(loket, service_date):
    """IN_POOL tickets for any service this loket can serve, today."""
    from apps.antrean.models import Ticket

    layanan_ids = list(loket.layanan.values_list("id", flat=True))
    return Ticket.objects.filter(
        layanan_id__in=layanan_ids,
        service_date=service_date,
        status=Ticket.Status.IN_POOL,
    ).select_related("layanan")


def _regulars_since_last_priority(loket, service_date) -> int:
    """How many regular tickets have been called since the last priority call —
    drives the 1:N interleave decision from history in the DB (no stored cursor)."""
    from apps.antrean.models import Ticket

    layanan_ids = list(loket.layanan.values_list("id", flat=True))
    called = list(
        Ticket.objects.filter(
            layanan_id__in=layanan_ids,
            service_date=service_date,
            status__in=[Ticket.Status.CALLED, Ticket.Status.SERVING, Ticket.Status.SERVED],
            called_at__isnull=False,
        )
        .order_by("-called_at")
        .values_list("is_priority", flat=True)
    )
    count = 0
    for is_priority in called:
        if is_priority:
            break
        count += 1
    return count


def pick_next(loket, service_date):
    """The single next ticket to call from this loket's pool, honoring hybrid
    ordering + the priority interleave ratio. None if the pool is empty."""
    pool = list(pool_for_loket(loket, service_date))
    if not pool:
        return None

    priority = sorted((t for t in pool if t.is_priority), key=_eff_key)
    regular = sorted((t for t in pool if not t.is_priority), key=_eff_key)

    if not priority:
        return regular[0]
    if not regular:
        return priority[0]

    # One priority per N regulars: if enough regulars have gone since the last
    # priority, the priority head jumps in; otherwise the regular head proceeds.
    ratio_n = priority[0].layanan.priority_ratio_n or 3
    if _regulars_since_last_priority(loket, service_date) >= ratio_n:
        return priority[0]
    return regular[0]


def position_ahead(ticket) -> int:
    """How many active tickets are ahead of this one in its service's line —
    powers the citizen's live position and the 'tinggal X lagi' trigger.

    Counts tickets already being handled (called/serving) plus pooled tickets
    with an earlier effective slot.
    """
    from apps.antrean.models import Ticket

    same = Ticket.objects.filter(layanan=ticket.layanan, service_date=ticket.service_date)
    in_service = same.filter(status__in=[Ticket.Status.CALLED, Ticket.Status.SERVING]).count()

    pooled = list(
        same.filter(status=Ticket.Status.IN_POOL).only(
            "taken_at", "checkin_at", "is_demoted", "seq"
        )
    )
    my_key = _eff_key(ticket)
    ahead_in_pool = sum(1 for t in pooled if t.id != ticket.id and _eff_key(t) < my_key)
    return in_service + ahead_in_pool
