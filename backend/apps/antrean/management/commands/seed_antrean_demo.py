"""
manage.py seed_antrean_demo

Seeds a demo MPP with two tenants — an OIKN directorate and an external agency —
each with services and a loket, plus global Tabel-8 parameters, so the full
walk-in / online → check-in → call → complete flow can be exercised end-to-end.
Idempotent.
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

# (instansi defaults, [service defaults], loket code)
TENANTS = [
    (
        {
            "key": "pelayanan-dasar",
            "name": "Direktorat Pelayanan Dasar (Kesehatan)",
            "short_name": "Pelayanan Dasar",
            "owner_type": "oikn",
            "description": "Layanan kesehatan dasar Otorita IKN di MPP.",
            "order": 1,
        },
        [
            {
                "key": "konsultasi-kesehatan",
                "name": "Konsultasi Kesehatan",
                "category": "lama",
                "avg_minutes": 25,
                "daily_quota": 12,
            },
            {
                "key": "rujukan",
                "name": "Surat Rujukan",
                "category": "cepat",
                "avg_minutes": 8,
                "daily_quota": 76,
                "order": 2,
            },
        ],
        "Loket A1",
    ),
    (
        {
            "key": "bpjs-kesehatan",
            "name": "BPJS Kesehatan",
            "short_name": "BPJS",
            "owner_type": "external",
            "description": "Layanan BPJS Kesehatan (instansi eksternal peserta MPP).",
            "order": 2,
        },
        [
            {
                "key": "cetak-kartu",
                "name": "Cetak Kartu BPJS",
                "category": "cepat",
                "avg_minutes": 8,
                "daily_quota": 76,
            },
            {
                "key": "perubahan-data",
                "name": "Perubahan Data Peserta",
                "category": "sedang",
                "avg_minutes": 12,
                "daily_quota": 51,
                "order": 2,
            },
        ],
        "Loket B1",
    ),
]


class Command(BaseCommand):
    help = "Seed demo MPP tenants (OIKN + external), services, lokets, params (idempotent)"

    def handle(self, *args, **options):
        from apps.antrean.models import Instansi, Layanan, Loket, QueueParameter

        for key, value, vt in GLOBAL_PARAMS:
            QueueParameter.objects.get_or_create(
                layanan=None, key=key, defaults={"value": value, "value_type": vt}
            )

        for inst_defaults, services, loket_code in TENANTS:
            key = inst_defaults.pop("key")
            instansi, _ = Instansi.objects.get_or_create(key=key, defaults=inst_defaults)
            for svc in services:
                svc_key = svc.pop("key")
                Layanan.objects.get_or_create(instansi=instansi, key=svc_key, defaults=svc)
                svc["key"] = svc_key
            loket, _ = Loket.objects.get_or_create(instansi=instansi, code=loket_code)
            loket.layanan.add(*instansi.layanan.all())
            self.stdout.write(
                self.style.SUCCESS(
                    f"Tenant '{key}' ({instansi.get_owner_type_display()}): "
                    f"{instansi.layanan.count()} layanan, loket {loket_code}."
                )
            )
