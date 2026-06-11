"""
manage.py bootstrap_superadmin

Creates the superadmin user from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD env vars.
Called automatically in entrypoint.sh on first boot. Idempotent.
"""
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create superadmin from env vars (idempotent)"

    def handle(self, *args, **options):
        from apps.accounts.models import Role, RolePermission, User, UserRole

        email = getattr(settings, "SUPERADMIN_EMAIL", "admin@lantara.ikn.go.id")
        password = getattr(settings, "SUPERADMIN_PASSWORD", "changeme")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": "Superadmin Lantara",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "is_email_verified": True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Superadmin created: {email}"))
        else:
            self.stdout.write(f"Superadmin already exists: {email}")

        # Ensure superadmin role exists and is assigned
        role, _ = Role.objects.get_or_create(
            key="superadmin",
            defaults={"name": "Superadmin", "description": "Full platform access"},
        )
        UserRole.objects.get_or_create(user=user, role=role, defaults={"is_active": True})
        self.stdout.write(self.style.SUCCESS("Superadmin role assigned."))
