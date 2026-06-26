"""
One-off data migration: seed the new Sektor.direktorats (M2M) from legacy data.

  1. Carry over the legacy single FK (pengampu_direktorat) when set.
  2. Best-effort: if the free-text `pengampu` EXACTLY matches a Direktorat name
     (case-insensitive), link it. Exact-only so we never guess wrong — anything
     else (e.g. "Direktorat P5 / Deputi …") is left for manual selection.

Idempotent — safe to re-run; .add() ignores duplicates.
"""

from django.db import migrations


def backfill_direktorats(apps, schema_editor):
    Sektor = apps.get_model("engine", "Sektor")
    Direktorat = apps.get_model("reference", "Direktorat")
    for sektor in Sektor.objects.all():
        if sektor.pengampu_direktorat_id:
            sektor.direktorats.add(sektor.pengampu_direktorat_id)
        elif sektor.pengampu and not sektor.direktorats.exists():
            match = Direktorat.objects.filter(name__iexact=sektor.pengampu.strip()).first()
            if match:
                sektor.direktorats.add(match.id)


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0003_sektor_direktorats_alter_sektor_pengampu_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_direktorats, migrations.RunPython.noop),
    ]
