from django.urls import re_path

from .consumers import DisplayBoardConsumer, QueuePositionConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/antrean/ticket/(?P<ticket_id>[0-9a-f-]+)/$",
        QueuePositionConsumer.as_asgi(),
    ),
    re_path(
        r"^ws/antrean/board/(?P<instansi_key>[-\w]+)/$",
        DisplayBoardConsumer.as_asgi(),
    ),
]
