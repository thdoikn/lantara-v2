"""Operating-window helpers — operating hours, cut-off, holiday/weekend skip.

Reuses the same working-day notion as submissions.sla (reference.Holiday +
weekends), but for same-day minute-level rules rather than multi-day SLA.
"""

from datetime import datetime, timedelta

from django.utils import timezone

from .params import get_param


def is_operating_day(d) -> bool:
    """True if d is a weekday and not a public holiday."""
    from apps.reference.models import Holiday

    if d.weekday() >= 5:
        return False
    return not Holiday.objects.filter(date=d).exists()


def _combine(d, t):
    return timezone.make_aware(datetime.combine(d, t), timezone.get_current_timezone())


def operating_window(d, layanan=None):
    """(open_dt, close_dt) for date d in the current timezone."""
    open_t = get_param("operating_open", layanan)
    close_t = get_param("operating_close", layanan)
    return _combine(d, open_t), _combine(d, close_t)


def take_number_open(now=None, layanan=None) -> bool:
    """Whether new tickets may be issued right now: operating day, after open,
    and before the cut-off (default 1 h before close)."""
    now = now or timezone.now()
    d = timezone.localtime(now).date()
    if not is_operating_day(d):
        return False
    open_dt, close_dt = operating_window(d, layanan)
    cutoff_min = get_param("cutoff_min", layanan)
    cutoff_dt = close_dt - timedelta(minutes=cutoff_min)
    return open_dt <= now < cutoff_dt
