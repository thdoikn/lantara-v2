"""Best-effort WebSocket fan-out for live queue position + display boards.

Mirrors notifications.utils._push_ws: group_send is wrapped so a missing channel
layer or transport hiccup never breaks the request that triggered it.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def _send(group: str, payload: dict) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group, {"type": "queue.message", "data": payload})
    except Exception:
        pass


def push_ticket_update(ticket, ahead: int | None = None) -> None:
    """Notify the citizen watching one ticket of a status/position change."""
    from .ordering import position_ahead

    if ahead is None and ticket.status == ticket.Status.IN_POOL:
        ahead = position_ahead(ticket)
    _send(
        f"antrean_ticket_{ticket.id}",
        {
            "type": "ticket_update",
            "id": str(ticket.id),
            "number": ticket.number,
            "status": ticket.status,
            "ahead": ahead,
            "estimated_call_at": (
                ticket.estimated_call_at.isoformat() if ticket.estimated_call_at else None
            ),
            "loket": ticket.loket.code if ticket.loket_id else None,
        },
    )


def push_board_update(instansi_id) -> None:
    """Tell the public display board for an instansi to refresh."""
    _send(f"antrean_board_{instansi_id}", {"type": "board_update"})
