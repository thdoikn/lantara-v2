"""
manage.py load_kbli

Parses SEKTOR_KBLI_2020.csv into Bidang + KbliCode reference tables.
CSV layout (CLAUDE.md §3.8):
  - Header on row 8 (0-indexed: 7)
  - Sektor section headers like 'A. PENDIDIKAN' appear in BIDANG column
  - BIDANG / SEKTOR / KBLI forward-filled within groups
"""

import csv
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.reference.models import Bidang, KbliCode

FIXTURES_BASE = Path("/fixtures/kbli")
FALLBACK_BASE = Path(__file__).resolve().parents[4] / "fixtures" / "kbli"

HEADER_ROW = 7  # 0-indexed row where CSV headers appear
COLUMNS = {
    "bidang": 0,
    "sektor_oss": 1,
    "kbli": 2,
    "title": 3,
    "verifier": 4,
    "lantara": 5,
    "pengampu": 6,
    "notes": 7,
}

SECTION_HEADER_RE = re.compile(r"^[A-Z]\.\s+.+", re.IGNORECASE)


class Command(BaseCommand):
    help = "Load KBLI 2020 master CSV into reference tables"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default="SEKTOR_KBLI_2020.csv",
            help="CSV filename inside fixtures/kbli/",
        )
        parser.add_argument(
            "--skip-if-exists",
            action="store_true",
            help="Skip if KbliCode table already has rows",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and count without writing to DB",
        )

    def handle(self, *args, **options):
        if options["skip_if_exists"] and KbliCode.objects.exists():
            self.stdout.write(self.style.WARNING("KBLI data already loaded — skipping."))
            return

        # Locate the CSV file
        csv_path = FIXTURES_BASE / options["file"]
        if not csv_path.exists():
            csv_path = FALLBACK_BASE / options["file"]
        if not csv_path.exists():
            raise CommandError(f"CSV file not found: {options['file']}")

        self.stdout.write(f"Loading KBLI from {csv_path} ...")

        rows = self._parse_csv(csv_path)
        if options["dry_run"]:
            self.stdout.write(f"Dry run: {len(rows)} data rows parsed.")
            return

        created_bidang = 0
        created_kbli = 0
        bidang_cache: dict[str, Bidang] = {}

        for row in rows:
            bidang_name = row["bidang"]
            bidang_code = bidang_name[:10].strip()

            if bidang_code not in bidang_cache:
                obj, created = Bidang.objects.get_or_create(
                    code=bidang_code,
                    defaults={"name": bidang_name},
                )
                bidang_cache[bidang_code] = obj
                if created:
                    created_bidang += 1

            bidang = bidang_cache[bidang_code]

            if not row["kbli"] or not row["title"]:
                continue

            _, created = KbliCode.objects.get_or_create(
                code=row["kbli"],
                defaults={
                    "bidang": bidang,
                    "sektor_oss_name": row["sektor_oss"],
                    "title": row["title"],
                    "verifier_sector": row["verifier"],
                    "lantara_izin_label": row["lantara"],
                    "pengampu": row["pengampu"],
                    "notes": row["notes"],
                },
            )
            if created:
                created_kbli += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"KBLI loaded: {created_bidang} bidang created, "
                f"{created_kbli} KBLI codes created. "
                f"Total in DB: {KbliCode.objects.count()} codes."
            )
        )

    def _parse_csv(self, path: Path) -> list[dict]:
        rows = []
        with open(path, encoding="utf-8-sig", errors="replace") as fh:
            reader = csv.reader(fh)
            all_rows = list(reader)

        # Find header row
        header_idx = None
        for i, row in enumerate(all_rows):
            joined = " ".join(row).upper()
            if "BIDANG" in joined and "KBLI" in joined:
                header_idx = i
                break

        if header_idx is None:
            self.stderr.write("Could not find header row — using default row 7.")
            header_idx = HEADER_ROW

        data_rows = all_rows[header_idx + 1 :]

        current_bidang = ""
        current_sektor = ""
        current_kbli = ""

        for raw in data_rows:
            # Pad short rows
            while len(raw) < 8:
                raw.append("")

            bidang_cell = raw[COLUMNS["bidang"]].strip()
            sektor_cell = raw[COLUMNS["sektor_oss"]].strip()
            kbli_cell = raw[COLUMNS["kbli"]].strip()
            title_cell = raw[COLUMNS["title"]].strip()

            # Skip section-header rows (e.g. 'A. PENDIDIKAN')
            if SECTION_HEADER_RE.match(bidang_cell) and not kbli_cell:
                current_bidang = bidang_cell
                current_sektor = ""
                continue

            # Forward-fill
            if bidang_cell:
                current_bidang = bidang_cell
            if sektor_cell:
                current_sektor = sektor_cell
            if kbli_cell:
                current_kbli = kbli_cell

            if not title_cell or not current_bidang:
                continue

            rows.append(
                {
                    "bidang": current_bidang,
                    "sektor_oss": current_sektor,
                    "kbli": current_kbli,
                    "title": title_cell,
                    "verifier": raw[COLUMNS["verifier"]].strip(),
                    "lantara": raw[COLUMNS["lantara"]].strip(),
                    "pengampu": raw[COLUMNS["pengampu"]].strip(),
                    "notes": raw[COLUMNS["notes"]].strip(),
                }
            )

        return rows
