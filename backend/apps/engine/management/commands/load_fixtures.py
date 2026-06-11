"""
manage.py load_fixtures

Loads all JSON fixture files from /fixtures/sektor_*/  into engine tables.
Fixture format mirrors the PermitType/WorkflowStage/FormField/DocumentRequirement schema.
Idempotent — uses get_or_create keyed on PermitType.key.
"""
import json
import logging
from pathlib import Path

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)

FIXTURES_DIRS = [
    Path("/fixtures/sektor_sosial"),
    Path("/fixtures/sektor_kesehatan"),
    Path("/fixtures/sektor_pendidikan"),
]
FALLBACK_BASE = Path(__file__).resolve().parents[6] / "fixtures"


class Command(BaseCommand):
    help = "Load sektor/izin fixture JSON files into engine tables"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-if-exists",
            action="store_true",
            help="Skip a fixture if its PermitType key already exists",
        )
        parser.add_argument(
            "--sektor",
            type=str,
            help="Only load fixtures from sektor_<key> directory",
        )

    def handle(self, *args, **options):
        from apps.engine.models import (
            DocumentRequirement,
            FormField,
            PermitType,
            Sektor,
            WorkflowStage,
        )

        dirs = FIXTURES_DIRS
        if options.get("sektor"):
            dirs = [Path(f"/fixtures/sektor_{options['sektor']}")]

        # Also check fallback (local dev without Docker)
        all_dirs = []
        for d in dirs:
            all_dirs.append(d)
            fallback = FALLBACK_BASE / d.name
            if fallback != d:
                all_dirs.append(fallback)

        loaded = 0
        skipped = 0

        for fixture_dir in all_dirs:
            if not fixture_dir.exists():
                continue
            for json_file in sorted(fixture_dir.glob("*.json")):
                result = self._load_file(
                    json_file,
                    skip_if_exists=options["skip_if_exists"],
                )
                if result == "loaded":
                    loaded += 1
                elif result == "skipped":
                    skipped += 1

        self.stdout.write(
            self.style.SUCCESS(f"Fixtures: {loaded} loaded, {skipped} skipped.")
        )

    def _load_file(self, path: Path, skip_if_exists: bool) -> str:
        from apps.engine.models import (
            DocumentRequirement,
            FormField,
            PermitType,
            Sektor,
            WorkflowStage,
        )

        with open(path) as fh:
            data = json.load(fh)

        sektor_data = data.get("sektor", {})
        sektor, _ = Sektor.objects.get_or_create(
            key=sektor_data["key"],
            defaults={
                "name": sektor_data.get("name", sektor_data["key"]),
                "description": sektor_data.get("description", ""),
                "icon": sektor_data.get("icon", ""),
                "order": sektor_data.get("order", 0),
                "pengampu": sektor_data.get("pengampu", ""),
            },
        )

        izin_data = data.get("permit_type", {})
        izin_key = izin_data["key"]

        if skip_if_exists and PermitType.objects.filter(key=izin_key).exists():
            self.stdout.write(f"  SKIP {izin_key}")
            return "skipped"

        permit_type, created = PermitType.objects.update_or_create(
            key=izin_key,
            defaults={
                "sektor": sektor,
                "name": izin_data["name"],
                "description": izin_data.get("description", ""),
                "is_berusaha": izin_data.get("is_berusaha", False),
                "oss_covered": izin_data.get("oss_covered", False),
                "sla_days": izin_data["sla_days"],
                "product_name": izin_data.get("product_name", ""),
                "legal_basis": izin_data.get("legal_basis", []),
                "fee_description": izin_data.get("fee_description", ""),
                "complaint_info": izin_data.get("complaint_info", ""),
                "is_published": izin_data.get("is_published", True),
            },
        )

        # Stages
        for stage in izin_data.get("stages", []):
            WorkflowStage.objects.update_or_create(
                permit_type=permit_type,
                key=stage["key"],
                defaults={
                    "order": stage["order"],
                    "name": stage["name"],
                    "stage_type": stage["stage_type"],
                    "actor_role": stage.get("actor_role", ""),
                    "sla_hours": stage.get("sla_hours", 0),
                    "requires_site_visit": stage.get("requires_site_visit", False),
                    "allowed_actions": stage.get("allowed_actions", []),
                    "is_terminal": stage.get("is_terminal", False),
                    "instructions": stage.get("instructions", ""),
                },
            )

        # Form fields
        for field in izin_data.get("form_fields", []):
            FormField.objects.update_or_create(
                permit_type=permit_type,
                key=field["key"],
                defaults={
                    "label": field["label"],
                    "field_type": field["field_type"],
                    "section": field.get("section", ""),
                    "order": field["order"],
                    "required": field.get("required", True),
                    "validation_json": field.get("validation_json", {}),
                    "options_json": field.get("options_json", []),
                    "prefill_from_profile": field.get("prefill_from_profile", False),
                    "help_text_field": field.get("help_text", ""),
                    "placeholder": field.get("placeholder", ""),
                },
            )

        # Document requirements
        for req in izin_data.get("doc_requirements", []):
            DocumentRequirement.objects.update_or_create(
                permit_type=permit_type,
                key=req["key"],
                defaults={
                    "title": req["title"],
                    "description": req.get("description", ""),
                    "allowed_types": req.get("allowed_types", ["pdf"]),
                    "max_bytes": req.get("max_bytes", 5 * 1024 * 1024),
                    "required": req.get("required", True),
                    "order": req.get("order", 0),
                    "conditional_field_key": req.get("conditional_field_key", ""),
                    "conditional_field_value": req.get("conditional_field_value", ""),
                },
            )

        action_word = "Created" if created else "Updated"
        self.stdout.write(f"  {action_word}: {izin_key} ({permit_type.name})")
        return "loaded"
