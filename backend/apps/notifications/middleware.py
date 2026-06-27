"""Channels middleware: authenticate WebSocket connections via a JWT access
token passed as ?token=<access> in the query string.

The SPA authenticates with JWT (localStorage), not session cookies, so the
default AuthMiddlewareStack would see only AnonymousUser. This middleware runs
inside that stack and overrides scope["user"] when a valid token is present.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]
        if token:
            user = await self._get_user(token)
            if user is not None:
                scope["user"] = user
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, token):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import AccessToken

        try:
            access = AccessToken(token)
            user_id = access["user_id"]
        except (TokenError, KeyError):
            return None
        user_model = get_user_model()
        try:
            return user_model.objects.get(id=user_id)
        except user_model.DoesNotExist:
            return None
