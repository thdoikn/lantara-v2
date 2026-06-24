"""Development settings."""

from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# Show emails in terminal during development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use local filesystem storage in dev if MinIO not available
# Override with USE_S3=true env var to force MinIO
import environ

_env = environ.Env()
if not _env.bool("USE_S3", default=True):
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    MEDIA_ROOT = BASE_DIR / "media"  # type: ignore[name-defined]  # noqa: F405
