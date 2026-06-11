"""Celery beat tasks — SLA sweep runs every 30 minutes."""
from celery import shared_task


@shared_task
def sweep_sla():
    """
    Recompute SLA flags for all active submissions.
    Fires notifications when at-risk or breached.
    """
    from .models import Submission
    from .sla import compute_submission_sla

    active_statuses = [
        Submission.Status.SUBMITTED,
        Submission.Status.IN_REVIEW,
        Submission.Status.REVISION,
        Submission.Status.PUBLISHING,
    ]
    submissions = Submission.objects.filter(
        status__in=active_statuses
    ).select_related("permit_type__sektor", "applicant")

    at_risk_count = 0
    breached_count = 0

    for sub in submissions:
        was_breached = sub.is_sla_breached
        was_at_risk = sub.is_sla_at_risk
        compute_submission_sla(sub)
        sub.save(update_fields=["sla_due_at", "stage_sla_due_at", "is_sla_breached", "is_sla_at_risk"])

        if sub.is_sla_breached and not was_breached:
            breached_count += 1
            _notify_sla_breached(sub)
        elif sub.is_sla_at_risk and not was_at_risk:
            at_risk_count += 1
            _notify_sla_at_risk(sub)

    return f"SLA sweep: {at_risk_count} at risk, {breached_count} breached."


def _notify_sla_breached(sub):
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification
    # Notify assigned verifiers + the applicant
    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.SLA_BREACHED,
        title="SLA Terlampaui",
        body=f"Pengajuan {sub.reference_number} telah melampaui batas waktu SLA.",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
    )


def _notify_sla_at_risk(sub):
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification
    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.SLA_AT_RISK,
        title="SLA Mendekati Batas",
        body=f"Pengajuan {sub.reference_number} mendekati batas waktu SLA (< 24 jam).",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
    )
