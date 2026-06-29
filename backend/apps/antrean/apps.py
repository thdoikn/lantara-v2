from django.apps import AppConfig


class AntreanConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.antrean"
    verbose_name = "Antrean MPP"

    def ready(self):
        # Register the collection-stage seam signal (antrean → submissions only).
        from . import signals  # noqa: F401
