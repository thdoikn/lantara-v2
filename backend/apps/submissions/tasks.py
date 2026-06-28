"""Celery beat tasks — SLA sweep + stale-claim release."""

from celery import shared_task


@shared_task
def release_stale_claims():
    """Free verifier claims held longer than STALE_CLAIM_HOURS without action.

    A claim means "I'm working this now". If it's been held that long with no
    action since it was claimed, the verifier has likely moved on — release it so
    teammates aren't blocked, and let the holder know.
    """
    from datetime import timedelta

    from django.conf import settings
    from django.db.models import F, Q
    from django.utils import timezone

    from .models import Submission

    cutoff = timezone.now() - timedelta(hours=getattr(settings, "STALE_CLAIM_HOURS", 4))
    # Claimed before the cutoff AND not acted on since the claim was made.
    stale = Submission.objects.filter(
        assigned_to__isnull=False, assigned_at__lt=cutoff
    ).filter(Q(last_acted_at__isnull=True) | Q(last_acted_at__lt=F("assigned_at")))

    released = 0
    for sub in stale.select_related("assigned_to"):
        holder = sub.assigned_to
        sub.assigned_to = None
        sub.assigned_at = None
        sub.save(update_fields=["assigned_to", "assigned_at", "updated_at"])
        released += 1
        _notify_claim_released(sub, holder)

    return f"Released {released} stale claim(s)."


def _notify_claim_released(sub, holder):
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    send_notification(
        recipient=holder,
        notif_type=Notification.NotifType.GENERAL,
        title="Klaim dilepas otomatis",
        body=f"Klaim Anda atas {sub.reference_number} dilepas karena tidak ada tindakan.",
        submission_id=sub.id,
        action_url=f"/verifier/submissions/{sub.id}",
        send_email=False,
    )


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
    submissions = Submission.objects.filter(status__in=active_statuses).select_related(
        "permit_type__sektor", "applicant"
    )

    at_risk_count = 0
    breached_count = 0

    for sub in submissions:
        was_breached = sub.is_sla_breached
        was_at_risk = sub.is_sla_at_risk
        compute_submission_sla(sub)
        sub.save(
            update_fields=["sla_due_at", "stage_sla_due_at", "is_sla_breached", "is_sla_at_risk"]
        )

        if sub.is_sla_breached and not was_breached:
            breached_count += 1
            _notify_sla_breached(sub)
        elif sub.is_sla_at_risk and not was_at_risk:
            at_risk_count += 1
            _notify_sla_at_risk(sub)

    return f"SLA sweep: {at_risk_count} at risk, {breached_count} breached."


def _notify_assigned_verifiers(sub, notif_type, title, body):
    """In-app SLA alert to every active verifier for this permit type."""
    from apps.accounts.models import VerifierPermitAssignment
    from apps.notifications.utils import send_notification

    assignments = VerifierPermitAssignment.objects.filter(
        permit_type=sub.permit_type, is_active=True
    ).select_related("user")
    for a in assignments:
        if a.user_id == sub.applicant_id:
            continue
        send_notification(
            recipient=a.user,
            notif_type=notif_type,
            title=title,
            body=body,
            submission_id=sub.id,
            action_url=f"/verifier/submissions/{sub.id}",
            send_email=False,
        )


def _notify_sla_breached(sub):
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.SLA_BREACHED,
        title="SLA Terlampaui",
        body=f"Pengajuan {sub.reference_number} telah melampaui batas waktu SLA.",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
    )
    _notify_assigned_verifiers(
        sub,
        Notification.NotifType.SLA_BREACHED,
        "SLA Terlampaui",
        f"{sub.reference_number} telah melampaui batas SLA dan menunggu tindakan.",
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
    _notify_assigned_verifiers(
        sub,
        Notification.NotifType.SLA_AT_RISK,
        "SLA Mendekati Batas",
        f"{sub.reference_number} mendekati batas SLA (< 24 jam).",
    )
