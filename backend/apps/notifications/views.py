from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from .models import Notification


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:50]
        return Response(_serialize_notifs(qs))


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids", [])
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True, read_at=timezone.now())
        return Response({"detail": "Ditandai sudah dibaca."})


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"count": count})


def _serialize_notifs(qs):
    return [
        {
            "id": str(n.id),
            "notif_type": n.notif_type,
            "title": n.title,
            "body": n.body,
            "is_read": n.is_read,
            "action_url": n.action_url,
            "submission_id": str(n.submission_id) if n.submission_id else None,
            "created_at": n.created_at.isoformat(),
        }
        for n in qs
    ]
