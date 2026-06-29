"""
manage.py seed_antrean_roles

Seeds the two MPP staff roles (mpp_operator, mpp_supervisor). Idempotent.
Counter staff are then scoped to an Instansi/Loket via CounterStaffAssignment.
"""

from django.core.management.base import BaseCommand

ANTREAN_ROLES = [
    {
        "key": "mpp_operator",
        "name": "Petugas Loket MPP",
        "description": "Memanggil & melayani antrean pada loket yang ditugaskan.",
    },
    {
        "key": "mpp_supervisor",
        "name": "Supervisor MPP",
        "description": "Memantau antrean, mengelola parameter & loket, tindakan eskalasi.",
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
