"""
manage.py seed_antrean_demo

Seeds a demo MPP agency (Perizinan OIKN) with services and a loket, plus global
Tabel-8 parameters, so the full citizen → check-in → call → complete flow can be
exercised end-to-end. One service links to a real izin PermitType's collection
stage to demonstrate the engine seam. Idempotent.
"""

from django.core.management.base import BaseCommand

GLOBAL_PARAMS = [
    ("checkin_window_min", "15", "int"),
    ("noshow_grace_min", "30", "int"),
    ("operating_open", "08:00", "time"),
    ("operating_close", "15:00", "time"),
    ("cutoff_min", "60", "int"),
    ("recall_interval_min", "3", "int"),
    ("position_notify_threshold", "3", "int"),
]


class Command(BaseCommand):
    help = "Seed a demo MPP instansi, services, loket, and Tabel-8 parameters (idempotent)"

    def handle(self, *args, **options):
        from apps.antrean.models import Instansi, Layanan, Loket, QueueParameter
        from apps.engine.models import PermitType

        # Global parameters (config-not-code).
        for key, value, vt in GLOBAL_PARAMS:
            QueueParameter.objects.get_or_create(
                layanan=None, key=key, defaults={"value": value, "value_type": vt}
            )

        instansi, _ = Instansi.objects.get_or_create(
            key="perizinan-oikn",
            defaults={
                "name": "Loket Perizinan OIKN",
                "short_name": "Perizinan",
                "description": "Layanan perizinan Otorita IKN di Mal Pelayanan Publik.",
                "order": 1,
            },
        )

        # Service linked to an izin's collection stage (the engine seam).
        izin = PermitType.objects.filter(stages__stage_type="collection").first()
        pickup, _ = Layanan.objects.get_or_create(
            instansi=instansi,
            key="pengambilan-izin",
            defaults={
                "name": "Pengambilan Dokumen Izin",
                "category": Layanan.Category.CEPAT,
                "avg_minutes": 8,
                "daily_quota": 76,
                "permit_type": izin,
            },
        )
        if izin and pickup.permit_type_id != izin.id:
            pickup.permit_type = izin
            pickup.save(update_fields=["permit_type"])

        # A standalone consultation service (no izin link) — walk-in heavy.
        Layanan.objects.get_or_create(
            instansi=instansi,
            key="konsultasi-perizinan",
            defaults={
                "name": "Konsultasi Perizinan",
                "category": Layanan.Category.LAMA,
                "avg_minutes": 25,
                "daily_quota": 12,
                "order": 2,
            },
        )

        loket, _ = Loket.objects.get_or_create(
            instansi=instansi, code="Loket 1", defaults={"name": "Loket Perizinan 1"}
        )
        loket.layanan.add(*instansi.layanan.all())

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded instansi '{instansi.key}' with {instansi.layanan.count()} layanan, "
                f"1 loket. Izin seam: {izin.key if izin else 'none found'}."
            )
        )
