# Ensure the Celery app is always initialized when Django starts,
# so @shared_task decorators bind to our app (not Kombu's default AMQP).
from .celery import app as celery_app

__all__ = ("celery_app",)
