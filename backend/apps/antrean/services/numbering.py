"""Per-(layanan, service_date) ticket numbering.

Called inside the take-ticket transaction with the day's rows locked, so the
sequence has no gaps or races.
"""

from django.db.models import Max

_CATEGORY_PREFIX = {"cepat": "A", "sedang": "B", "lama": "C"}


def next_seq_and_number(layanan, service_date) -> tuple[int, str]:
    """Return (seq, display_number) for a new ticket. Caller must hold a row lock
    (select_for_update) on the day's tickets to stay race-free."""
    from apps.antrean.models import Ticket

    current_max = (
        Ticket.objects.filter(layanan=layanan, service_date=service_date).aggregate(m=Max("seq"))[
            "m"
        ]
        or 0
    )
    seq = current_max + 1
    prefix = _CATEGORY_PREFIX.get(layanan.category, "B")
    return seq, f"{prefix}-{seq:03d}"
