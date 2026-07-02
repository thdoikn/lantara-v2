"""WebSocket consumers for live queue position + public display boards.

Group sends originate in services.realtime with message type 'queue.message',
handled by ``queue_message`` below (Channels maps the dotted type to the method).
"""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class QueuePositionConsumer(AsyncWebsocketConsumer):
    """Authenticated citizen watching one ticket. Group: antrean_ticket_{id}."""

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return
        self.ticket_id = self.scope["url_route"]["kwargs"]["ticket_id"]
        if not await self._owns_ticket(user, self.ticket_id):
            await self.close()
            return
        self.group_name = f"antrean_ticket_{self.ticket_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def queue_message(self, event):
        await self.send(json.dumps(event["data"]))

    @database_sync_to_async
    def _owns_ticket(self, user, ticket_id) -> bool:
        from apps.antrean.models import Ticket

        return Ticket.objects.filter(id=ticket_id, applicant=user).exists()


class DisplayBoardConsumer(AsyncWebsocketConsumer):
    """Public 'now serving' board for an instansi. Group: antrean_board_{id}.

    Intentionally unauthenticated (a lobby screen) — it carries only ticket
    numbers and loket codes, no personal data. Origin is already restricted by
    AllowedHostsOriginValidator in asgi.
    """

    async def connect(self):
        self.instansi_key = self.scope["url_route"]["kwargs"]["instansi_key"]
        instansi_id = await self._instansi_id(self.instansi_key)
        if instansi_id is None:
            await self.close()
            return
        self.group_name = f"antrean_board_{instansi_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def queue_message(self, event):
        await self.send(json.dumps(event["data"]))

    @database_sync_to_async
    def _instansi_id(self, key):
        from apps.antrean.models import Instansi

        row = Instansi.objects.filter(key=key, is_active=True).values_list("id", flat=True).first()
        return str(row) if row else None
