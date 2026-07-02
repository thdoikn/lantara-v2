"""Tabel-8 parameter resolution (config-not-code).

Resolution order for a knob, most specific first:
  1. typed column on the Layanan (online_ratio, priority_ratio_n, recall_max…)
  2. QueueParameter row scoped to that Layanan
  3. global QueueParameter row (layanan=None)
  4. hard-coded DEFAULTS below

All numeric params are configurable via the admin so they can be recalibrated
once real MPP data exists (planning doc §8, §10).
"""

from datetime import time
from decimal import Decimal

# Hard-coded fallbacks — mirror the planning doc's Tabel Parameter Final.
DEFAULTS = {
    "checkin_window_min": 15,  # check-in at latest 15 min before the estimate
    "noshow_grace_min": 30,  # no-show 30 min after the estimate → hangus
    "operating_open": "08:00",
    "operating_close": "15:00",
    "cutoff_min": 60,  # take-number closes 1 h before close
    "recall_interval_min": 3,  # ±3 min between recalls
    "position_notify_threshold": 3,  # "tinggal X lagi" trigger
    # An un-checked-in online ticket expires once this many later numbers have
    # been called ahead of it (it kept getting skipped). The holder must take a
    # fresh number. See services.ordering.skipped_count.
    "max_skip_before_expire": 5,
}


def _coerce(value: str, value_type: str):
    if value_type == "int":
        return int(value)
    if value_type == "decimal":
        return Decimal(value)
    if value_type == "bool":
        return value.strip().lower() in ("1", "true", "yes", "ya")
    if value_type == "time":
        hh, mm = value.split(":")
        return time(int(hh), int(mm))
    return value


def get_param(key: str, layanan=None):
    """Resolve a single knob (steps 2→4; typed columns are read directly off
    Layanan by callers that have them)."""
    from apps.antrean.models import QueueParameter

    if layanan is not None:
        row = QueueParameter.objects.filter(layanan=layanan, key=key).first()
        if row:
            return _coerce(row.value, row.value_type)
    row = QueueParameter.objects.filter(layanan__isnull=True, key=key).first()
    if row:
        return _coerce(row.value, row.value_type)

    fallback = DEFAULTS.get(key)
    if key in ("operating_open", "operating_close") and isinstance(fallback, str):
        hh, mm = fallback.split(":")
        return time(int(hh), int(mm))
    return fallback
