"""
manage.py seed_antrean_roles

Seeds the two MPP staff roles (tenant_admin, loket_operator). Idempotent.
Scope is then set via CounterStaffAssignment:
  - an OIKN admin assigns a tenant_admin to a tenant (Instansi);
  - that tenant_admin assigns loket_operators to its lokets.
"""

from django.core.management.base import BaseCommand

ANTREAN_ROLES = [
    {
        "key": "tenant_admin",
        "name": "Admin Tenant MPP",
        "description": "Mengelola loket, jam operasional, dan kuota tenant; menugaskan petugas loket.",
    },
    {
        "key": "loket_operator",
        "name": "Petugas Loket MPP",
        "description": "Memanggil & melayani antrean pada loket yang ditugaskan.",
    },
]


class Command(BaseCommand):
    help = "Seed MPP antrean staff roles (idempotent)"

    def handle(self, *args, **options):
        from apps.accounts.models import Role

        for data in ANTREAN_ROLES:
            role, created = Role.objects.get_or_create(
                key=data["key"],
                defaults={"name": data["name"], "description": data["description"]},
            )
            verb = "created" if created else "exists"
            self.stdout.write(self.style.SUCCESS(f"Role {verb}: {role.key}"))
