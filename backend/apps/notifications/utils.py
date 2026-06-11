"""
Notification dispatch — creates in-app notification, sends via email and
optionally WhatsApp if enabled. Also pushes real-time via channel layer.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone


def send_notification(
    recipient,
    notif_type: str,
    title: str,
    body: str,
    submission_id=None,
    action_url: str = "",
    send_email: bool = True,
    send_whatsapp: bool = False,
):
    from .models import Notification

    notif = Notification.objects.create(
        recipient=recipient,
        notif_type=notif_type,
        title=title,
        body=body,
        submission_id=submission_id,
        action_url=action_url,
    )

    # Real-time push via WebSocket
    _push_ws(recipient.id, notif)

    if send_email:
        _send_email(recipient, notif)
        notif.email_sent = True
        notif.save(update_fields=["email_sent"])

    if send_whatsapp:
        from django.conf import settings
        if getattr(settings, "FEATURE_WHATSAPP_ENABLED", False):
            _send_whatsapp(recipient, notif)
            notif.whatsapp_sent = True
            notif.save(update_fields=["whatsapp_sent"])

    return notif


def _push_ws(user_id, notif):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                "type": "notification.message",
                "data": {
                    "type": "notification",
                    "id": str(notif.id),
                    "notif_type": notif.notif_type,
                    "title": notif.title,
                    "body": notif.body,
                    "action_url": notif.action_url,
                    "created_at": notif.created_at.isoformat(),
                },
            },
        )
    except Exception:
        pass  # WS push is best-effort; DB record already created


def _send_email(recipient, notif):
    from django.core.mail import send_mail
    send_mail(
        subject=notif.title,
        message=notif.body,
        from_email=None,
        recipient_list=[recipient.email],
        fail_silently=True,
    )


def _send_whatsapp(recipient, notif):
    from apps.whatsapp.adapter import send_whatsapp_message
    number = recipient.whatsapp_number or recipient.phone
    if number:
        send_whatsapp_message(number, f"{notif.title}\n\n{notif.body}")
