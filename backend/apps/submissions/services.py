"""Reusable submission transitions callable without the HTTP layer.

Kept here so other contexts (e.g. the antrean MPP queue completing an in-person
pickup) drive the same state change as the verifier workspace, without importing
views or duplicating the COLLECTION → COLLECTED transition.
"""

from django.db import transaction
from django.utils import timezone


@transaction.atomic
def mark_collected(submission, actor=None, notes=""):
    """Advance a submission that is ready-for-pickup to collected. Idempotent —
    a no-op if it is already collected. Writes the audit entry and notifies the
    applicant. Returns the submission."""
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    from .models import AuditEntry, Submission

    if submission.status == Submission.Status.COLLECTED:
        return submission
    if submission.status != Submission.Status.COLLECTION:
        # Only a ready-for-pickup submission can be collected; never force it.
        return submission

    from_status = submission.status
    submission.status = Submission.Status.COLLECTED
    submission.last_actor = actor
    submission.last_acted_at = timezone.now()
    submission.save(update_fields=["status", "last_actor", "last_acted_at", "updated_at"])

    AuditEntry.objects.create(
        submission=submission,
        action=AuditEntry.ActionType.COLLECT,
        actor=actor,
        from_status=from_status,
        to_status=submission.status,
        notes=notes,
    )
    send_notification(
        recipient=submission.applicant,
        notif_type=Notification.NotifType.GENERAL,
        title="Izin telah diambil",
        body=f"Pengajuan {submission.reference_number} telah selesai dan diterima.",
        submission_id=submission.id,
        action_url=f"/portal/submissions/{submission.id}",
        send_email=False,
    )
    return submission
