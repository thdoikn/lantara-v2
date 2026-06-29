"""Daily quota — hard 60/40 online:walk-in split per service per day.

Planning doc §7.1 / Tabel 8: the split is rigid all day. If the online share is
exhausted while walk-in remains, the remainder stays walk-in's — never reassigned
(and vice-versa). Quotas never move between services. ``daily_quota`` null =
unlimited (no cap on either channel).
"""

from decimal import Decimal
from math import floor

from apps.antrean.models import ACTIVE_TICKET_STATUSES

from .errors import QuotaExhaustedError


def channel_caps(layanan) -> tuple[int | None, int | None]:
    """(online_cap, walkin_cap) for the service; (None, None) if unlimited."""
    if layanan.daily_quota is None:
        return None, None
    total = layanan.daily_quota
    online_cap = floor(total * float(layanan.online_ratio or Decimal("0.60")))
    return online_cap, total - online_cap


def channel_usage(layanan, service_date, channel) -> int:
    """Tickets of this channel that still hold a quota seat today (active or
    already served — a served ticket consumed its seat; cancelled/expired/no-show
    free it back)."""
    from apps.antrean.models import Ticket

    counted = set(ACTIVE_TICKET_STATUSES) | {Ticket.Status.SERVED}
    return Ticket.objects.filter(
        layanan=layanan,
        service_date=service_date,
        channel=channel,
        status__in=counted,
    ).count()


def assert_quota_available(layanan, service_date, channel) -> None:
    """Raise QuotaExhaustedError if this channel's share for the day is used up."""
    online_cap, walkin_cap = channel_caps(layanan)
    if online_cap is None:
        return  # unlimited
    cap = online_cap if channel == "online" else walkin_cap
    if channel_usage(layanan, service_date, channel) >= cap:
        label = "online" if channel == "online" else "walk-in"
        raise QuotaExhaustedError(f"Kuota {label} untuk layanan ini sudah habis hari ini.")
