"""
manage.py seed_rdtr_mock

Seeds mock RDTR zones for IKN (Ibu Kota Nusantara) area.
Uses approximate bounding boxes around the Penajam Paser Utara / Kutai Kartanegara
area where IKN is being built.

These are MOCK zones — not real spatial data. Replace bbox/geojson with
real OneMap/BIG data when available.
"""
from django.core.management.base import BaseCommand

# IKN approximate center: lat=-0.85, lng=116.72
# Zones are rough 0.05° × 0.05° bboxes around that area
MOCK_ZONES = [
    {
        "zone_code": "IKN-P1",
        "name": "Kawasan Inti Pusat Pemerintahan",
        "zone_type": "perkantoran",
        "bbox": [116.68, -0.90, 116.75, -0.80],
        "allowed_sektors": ["P", "O", "M"],
        "description": "Zona inti KIPP — kantor pemerintahan pusat, kementerian, dan fasilitas negara.",
    },
    {
        "zone_code": "IKN-R1",
        "name": "Kawasan Perumahan Pejabat Negara",
        "zone_type": "perumahan",
        "bbox": [116.72, -0.88, 116.80, -0.78],
        "allowed_sektors": ["L", "F"],
        "description": "Zona hunian pejabat negara dan ASN tingkat tinggi.",
    },
    {
        "zone_code": "IKN-C1",
        "name": "Kawasan Perdagangan & Jasa Pusat",
        "zone_type": "perdagangan",
        "bbox": [116.70, -0.92, 116.78, -0.82],
        "allowed_sektors": ["G", "H", "I", "J", "K"],
        "description": "Pusat perdagangan, hotel, restoran, dan layanan komersial.",
    },
    {
        "zone_code": "IKN-E1",
        "name": "Kawasan Pendidikan Tinggi",
        "zone_type": "pendidikan",
        "bbox": [116.65, -0.87, 116.72, -0.78],
        "allowed_sektors": ["P"],
        "description": "Zona kampus dan lembaga penelitian.",
    },
    {
        "zone_code": "IKN-H1",
        "name": "Kawasan Kesehatan Terpadu",
        "zone_type": "kesehatan",
        "bbox": [116.74, -0.93, 116.81, -0.85],
        "allowed_sektors": ["Q"],
        "description": "RS Nasional, klinik spesialis, dan fasilitas kesehatan unggulan.",
    },
    {
        "zone_code": "IKN-T1",
        "name": "Kawasan Hijau & RTH Utama",
        "zone_type": "rth",
        "bbox": [116.60, -0.95, 116.68, -0.80],
        "allowed_sektors": [],
        "description": "Hutan kota, taman, dan ruang terbuka hijau utama IKN.",
    },
    {
        "zone_code": "IKN-I1",
        "name": "Kawasan Industri Ringan",
        "zone_type": "industri",
        "bbox": [116.78, -0.97, 116.88, -0.87],
        "allowed_sektors": ["C", "D", "E"],
        "description": "Zona industri ringan dan logistik pendukung.",
    },
    {
        "zone_code": "IKN-M1",
        "name": "Kawasan Campuran Selatan",
        "zone_type": "campuran",
        "bbox": [116.68, -0.98, 116.78, -0.90],
        "allowed_sektors": ["F", "G", "I", "L", "Q"],
        "description": "Kawasan multi-fungsi: hunian, komersial, dan fasilitas.",
    },
]


class Command(BaseCommand):
    help = "Seed mock RDTR zones for IKN (Ibu Kota Nusantara)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing zones before seeding",
        )

    def handle(self, *args, **options):
        from apps.rdtr.models import RDTRZone

        if options["clear"]:
            RDTRZone.objects.all().delete()
            self.stdout.write("Cleared existing zones.")

        created = 0
        updated = 0
        for z in MOCK_ZONES:
            # Build simple GeoJSON polygon from bbox
            min_lng, min_lat, max_lng, max_lat = z["bbox"]
            geojson = {
                "type": "Polygon",
                "coordinates": [[
                    [min_lng, min_lat],
                    [max_lng, min_lat],
                    [max_lng, max_lat],
                    [min_lng, max_lat],
                    [min_lng, min_lat],
                ]],
            }
            _, was_created = RDTRZone.objects.update_or_create(
                zone_code=z["zone_code"],
                defaults={
                    "name": z["name"],
                    "zone_type": z["zone_type"],
                    "bbox": z["bbox"],
                    "geojson": geojson,
                    "allowed_sektors": z["allowed_sektors"],
                    "description": z["description"],
                    "source": "mock-ikn",
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"RDTR mock zones: {created} created, {updated} updated. Total: {RDTRZone.objects.count()}"
            )
        )
