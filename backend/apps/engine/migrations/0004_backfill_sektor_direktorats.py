"""
One-off data migration: seed the new Sektor.direktorats (M2M) from legacy data.

  1. Carry over the legacy single FK (pengampu_direktorat) when set.
  2. Best-effort: match the free-text `pengampu` to a Direktorat name
     (case-insensitive), trying the text as-is and again with a trailing
     parenthetical clarifier removed — e.g. "Direktorat Pelayanan Dasar
     (Dit. Yandas)" → "Direktorat Pelayanan Dasar". Exact-match only (after that
     normalization) so we never guess wrong; anything ambiguous (e.g.
     "Direktorat P5 / Deputi …") is left for manual selection.

Idempotent — safe to re-run; .add() ignores duplicates.
"""

import re

from django.db import migrations


def _match(direktorat_model, text):
    text = (text or "").strip()
    if not text:
        return None
    found = direktorat_model.objects.filter(name__iexact=text).first()
    if found:
        return found
    # Retry without a trailing "(...)" clarifier.
    stripped = re.sub(r"\s*\([^)]*\)\s*$", "", text).strip()
    if stripped and stripped != text:
        return direktorat_model.objects.filter(name__iexact=stripped).first()
    return None


def backfill_direktorats(apps, schema_editor):
    Sektor = apps.get_model("engine", "Sektor")
    Direktorat = apps.get_model("reference", "Direktorat")
    for sektor in Sektor.objects.all():
        if sektor.pengampu_direktorat_id:
            sektor.direktorats.add(sektor.pengampu_direktorat_id)
        elif sektor.pengampu and not sektor.direktorats.exists():
            match = _match(Direktorat, sektor.pengampu)
            if match:
                sektor.direktorats.add(match.id)


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0003_sektor_direktorats_alter_sektor_pengampu_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_direktorats, migrations.RunPython.noop),
    ]
