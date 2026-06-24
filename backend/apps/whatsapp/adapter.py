"""
WhatsApp adapter — Mekari/WABA vendor behind an interface.
Vendor-swappable: swap the implementation, keep the call signature.
Only active when FEATURE_WHATSAPP_ENABLED=true.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_whatsapp_message(phone_number: str, message: str) -> bool:
    if not getattr(settings, "FEATURE_WHATSAPP_ENABLED", False):
        logger.debug("WhatsApp disabled — message not sent to %s", phone_number)
        return False

    api_url = getattr(settings, "WHATSAPP_API_URL", "")
    api_token = getattr(settings, "WHATSAPP_API_TOKEN", "")

    if not api_url or not api_token:
        logger.warning("WhatsApp API not configured.")
        return False

    try:
        import requests

        resp = requests.post(
            f"{api_url}/messages",
            headers={"Authorization": f"Bearer {api_token}"},
            json={"to": phone_number, "text": {"body": message}},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)
        return False
