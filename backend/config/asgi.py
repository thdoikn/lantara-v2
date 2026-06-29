"""ASGI config — Django Channels for WebSocket support."""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

django_asgi_app = get_asgi_application()

from apps.antrean.routing import websocket_urlpatterns as antrean_ws  # noqa: E402
from apps.notifications.middleware import JWTAuthMiddleware  # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notif_ws  # noqa: E402

# No central routing aggregator exists; concatenate each app's WS patterns here.
websocket_urlpatterns = notif_ws + antrean_ws

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # JWTAuthMiddleware runs inside AuthMiddlewareStack so a valid ?token=
        # overrides the (anonymous) session user the SPA never sets. Public
        # consumers (display board) simply ignore the anonymous user.
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(JWTAuthMiddleware(URLRouter(websocket_urlpatterns)))
        ),
    }
)
