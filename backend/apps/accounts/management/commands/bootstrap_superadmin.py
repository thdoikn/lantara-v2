"""
manage.py bootstrap_superadmin

Creates the superadmin user from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD env vars
and seeds the three system roles (superadmin, admin, verifier).
Called automatically in entrypoint.sh on first boot. Idempotent.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

SYSTEM_ROLES = [
    {
        "key": "superadmin",
        "name": "Superadmin",
        "description": "Full platform access — all permissions implied",
    },
    {
        "key": "admin",
        "name": "Admin OIKN",
        "description": "Access to admin portal and engine builder; can assign verifiers",
    },
    {
        "key": "verifier",
        "name": "Verifikator",
        "description": "Access to verifier workspace; queue limited to assigned permit types",
    },
]


class Command(BaseCommand):
    help = "Create superadmin and seed system roles (idempotent)"

    def handle(self, *args, **options):
        from apps.accounts.models import Role, User, UserRole

        # Seed system roles
        for role_data in SYSTEM_ROLES:
            role, created = Role.objects.get_or_create(
                key=role_data["key"],
                defaults={"name": role_data["name"], "description": role_data["description"]},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Role created: {role.key}"))

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

        # Ensure superadmin role is assigned
        superadmin_role = Role.objects.get(key="superadmin")
        UserRole.objects.get_or_create(
            user=user, role=superadmin_role, defaults={"is_active": True}
        )
        self.stdout.write(self.style.SUCCESS("Superadmin role assigned."))
