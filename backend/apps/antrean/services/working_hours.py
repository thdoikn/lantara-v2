"""Operating-window helpers — per-tenant hours + break, cut-off, holiday/weekend.

Hours resolve from the tenant (Instansi) when set, else the global QueueParameter
defaults. During the break window the counter neither issues nor calls numbers.
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


def _tenant_of(layanan):
    return layanan.instansi if layanan is not None else None


def operating_window(d, layanan=None):
    """(open_dt, close_dt) for date d — tenant hours override the global params."""
    tenant = _tenant_of(layanan)
    open_t = (tenant and tenant.operating_open) or get_param("operating_open", layanan)
    close_t = (tenant and tenant.operating_close) or get_param("operating_close", layanan)
    return _combine(d, open_t), _combine(d, close_t)


def in_break(now, layanan=None) -> bool:
    """True if `now` falls inside the tenant's break window."""
    tenant = _tenant_of(layanan)
    if not tenant or not tenant.break_start or not tenant.break_end:
        return False
    t = timezone.localtime(now).time()
    return tenant.break_start <= t < tenant.break_end


def take_number_open(now=None, layanan=None) -> bool:
    """Whether new tickets may be issued now: operating day, after open, before the
    cut-off (default 1 h before close), and not during the break."""
    now = now or timezone.now()
    d = timezone.localtime(now).date()
    if not is_operating_day(d):
        return False
    if in_break(now, layanan):
        return False
    open_dt, close_dt = operating_window(d, layanan)
    cutoff_min = get_param("cutoff_min", layanan)
    cutoff_dt = close_dt - timedelta(minutes=cutoff_min)
    return open_dt <= now < cutoff_dt


def calling_open(now=None, layanan=None) -> bool:
    """Whether a counter may call numbers now: operating day, within hours, not on
    break. (Operators still open/close their loket manually on top of this.)"""
    now = now or timezone.now()
    d = timezone.localtime(now).date()
    if not is_operating_day(d) or in_break(now, layanan):
        return False
    open_dt, close_dt = operating_window(d, layanan)
    return open_dt <= now < close_dt
