"""Production settings."""

from django.core.exceptions import ImproperlyConfigured

from .base import *

DEBUG = False

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# Cookies are only ever sent first-party (the SPA talks to /api on the same
# origin via nginx); SameSite=Strict blocks them from cross-site contexts.
SESSION_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SAMESITE = "Strict"

# ── Fail-closed guards — never let production boot with insecure defaults ─────
# A misconfigured deploy (missing .env) is a common cause of "the scanner found
# DEBUG/default-key in prod". Refuse to start instead of silently exposing it.
if SECRET_KEY in ("", "django-insecure-change-me-in-production") or SECRET_KEY.startswith(
    "django-insecure-"
):
    raise ImproperlyConfigured(
        "SECRET_KEY is unset or using the insecure default. Set a strong, random "
        "SECRET_KEY in the environment before running in production."
    )

if "*" in ALLOWED_HOSTS or not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "ALLOWED_HOSTS must list explicit hostnames in production (no wildcard '*')."
    )

if SUPERADMIN_PASSWORD in ("", "changeme", "changeme-in-prod"):
    raise ImproperlyConfigured(
        "SUPERADMIN_PASSWORD is using a default value. Set a strong password in the environment."
    )

# CORS in production is restricted to the configured origins only (never allow-all).
CORS_ALLOW_ALL_ORIGINS = False
