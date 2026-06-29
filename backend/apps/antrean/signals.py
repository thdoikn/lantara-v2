"""Collection-stage seam: offer (not auto-issue) an antrean ticket when an izin
submission becomes ready for pickup.

Dependency direction is antrean → submissions only — submissions and engine never
import antrean. Implemented as a post_save receiver here so no edit to the
submissions view layer is required. The offer is a notification with a deep link;
the citizen then explicitly takes the ticket via the antrean API.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="submissions.Submission", dispatch_uid="antrean_offer_on_collection")
def offer_ticket_on_collection(sender, instance, created, **kwargs):
    from apps.submissions.models import Submission

    if instance.status != Submission.Status.COLLECTION:
        return

    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    from .models import ACTIVE_TICKET_STATUSES, Layanan, Ticket

    # Is there a configured MPP service for this izin?
    layanan = Layanan.objects.filter(permit_type_id=instance.permit_type_id, is_active=True).first()
    if layanan is None:
        return

    # Don't re-offer if a ticket for this submission is already live.
    if Ticket.objects.filter(submission_id=instance.id, status__in=ACTIVE_TICKET_STATUSES).exists():
        return

    # Avoid duplicate offers: only nudge once per entry into the collection stage.
    already_offered = Notification.objects.filter(
        recipient_id=instance.applicant_id,
        submission_id=instance.id,
        notif_type=Notification.NotifType.ANTREAN_AVAILABLE,
    ).exists()
    if already_offered:
        return

    send_notification(
        recipient=instance.applicant,
        notif_type=Notification.NotifType.ANTREAN_AVAILABLE,
        title="Ambil antrean untuk pengambilan izin",
        body=(
            f"Izin {instance.reference_number} siap diambil di MPP. "
            "Ambil nomor antrean online dan pantau estimasi panggilannya."
        ),
        submission_id=instance.id,
        action_url=f"/portal/submissions/{instance.id}/antrean",
        send_email=False,
    )
