"""
SLA working-days calculator.
Skips weekends (Sat/Sun) and Indonesian public holidays from reference.Holiday.
"""

from datetime import date, timedelta

from django.utils import timezone


def _is_working_day(d: date, holidays: set) -> bool:
    return d.weekday() < 5 and d not in holidays


def _get_holidays() -> set[date]:
    from apps.reference.models import Holiday

    return set(Holiday.objects.values_list("date", flat=True))


def add_working_days(start_dt, working_days: int):
    """Return a datetime `working_days` working days after `start_dt`."""
    holidays = _get_holidays()
    current = start_dt.date() if hasattr(start_dt, "date") else start_dt
    days_added = 0
    while days_added < working_days:
        current += timedelta(days=1)
        if _is_working_day(current, holidays):
            days_added += 1
    return timezone.datetime.combine(current, timezone.datetime.min.time()).replace(
        tzinfo=timezone.get_current_timezone()
    )


def add_working_hours(start_dt, working_hours: int):
    """Approximate: treat 8h = 1 working day."""
    days = working_hours // 8
    remaining_hours = working_hours % 8
    result = add_working_days(start_dt, days)
    return result + timedelta(hours=remaining_hours)


def compute_submission_sla(submission) -> None:
    """Recompute sla_due_at and stage_sla_due_at for a submission."""
    if not submission.submitted_at:
        return

    # Read service time and per-stage SLA from the submission's frozen snapshot
    # so live config edits never reshape an in-flight submission's SLA.
    submission.sla_due_at = add_working_days(submission.submitted_at, submission.get_sla_days())

    # Per-stage SLA
    if submission.current_stage_key:
        stage = submission.get_current_stage()
        stage_sla_hours = (stage or {}).get("sla_hours") or 0
        if stage_sla_hours and submission.stage_entered_at:
            submission.stage_sla_due_at = add_working_hours(
                submission.stage_entered_at, stage_sla_hours
            )

    # Flag risk/breach
    now = timezone.now()
    if submission.sla_due_at:
        submission.is_sla_breached = now > submission.sla_due_at
        warning_threshold = submission.sla_due_at - timedelta(hours=24)
        submission.is_sla_at_risk = not submission.is_sla_breached and now > warning_threshold
