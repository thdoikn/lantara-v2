from django.apps import AppConfig


class EngineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.engine"

    def ready(self):
        from . import signals  # noqa: F401  (wires RBAC key-sync receivers)
