"""WebSocket consumer — delivers real-time notifications to authenticated users."""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return
        self.group_name = f"notifications_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        # Send unread count on connect
        count = await self._unread_count(user)
        await self.send(json.dumps({"type": "unread_count", "count": count}))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """Mark notifications as read when client sends {type: 'mark_read', ids: [...]}"""
        if not text_data:
            return
        data = json.loads(text_data)
        if data.get("type") == "mark_read":
            user = self.scope["user"]
            ids = data.get("ids", [])
            await self._mark_read(user, ids)

    # Channel layer message handler
    async def notification_message(self, event):
        await self.send(json.dumps(event["data"]))

    @database_sync_to_async
    def _unread_count(self, user):
        from apps.notifications.models import Notification
        return Notification.objects.filter(recipient=user, is_read=False).count()

    @database_sync_to_async
    def _mark_read(self, user, ids):
        from django.utils import timezone
        from apps.notifications.models import Notification
        qs = Notification.objects.filter(recipient=user, is_read=False)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True, read_at=timezone.now())
