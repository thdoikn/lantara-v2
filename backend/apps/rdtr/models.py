"""
RDTR (Rencana Detail Tata Ruang) models — Phase 3.

Uses mock spatial data (no live OneMap integration yet, dependency-gated per CLAUDE.md §9).
Real spatial queries would be replaced by a PostGIS / OneMap call at the same API surface.
"""
from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.common.models import TimestampedModel


class RDTRZone(TimestampedModel):
    """
    A land-use zone polygon (stored as GeoJSON-compatible bbox for mock).
    Real implementation would use django.contrib.gis PolygonField.
    """

    class ZoneType(models.TextChoices):
        PERUMAHAN = "perumahan", "Perumahan"
        PERDAGANGAN = "perdagangan", "Perdagangan & Jasa"
        INDUSTRI = "industri", "Industri"
        PENDIDIKAN = "pendidikan", "Sarana Pendidikan"
        KESEHATAN = "kesehatan", "Sarana Kesehatan"
        PERKANTORAN = "perkantoran", "Perkantoran"
        CAMPURAN = "campuran", "Campuran"
        RTH = "rth", "Ruang Terbuka Hijau"
        TRANSPORTASI = "transportasi", "Transportasi"
        PERTANIAN = "pertanian", "Pertanian"

    zone_code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    zone_type = models.CharField(max_length=30, choices=ZoneType.choices)
    # Bounding box as [min_lng, min_lat, max_lng, max_lat] — mock spatial
    bbox = ArrayField(models.FloatField(), size=4, default=list)
    # GeoJSON polygon (simplified, for mock rendering)
    geojson = models.JSONField(default=dict)
    # KBLI sector keys allowed in this zone
    allowed_sektors = ArrayField(models.CharField(max_length=50), default=list)
    # Specific KBLI codes explicitly allowed (empty = allow all in sector)
    allowed_kbli_codes = ArrayField(models.CharField(max_length=10), default=list)
    description = models.TextField(blank=True)
    source = models.CharField(max_length=100, default="mock", blank=True)

    class Meta:
        ordering = ["zone_code"]

    def __str__(self):
        return f"{self.zone_code} — {self.name}"


class KBLICompatibility(TimestampedModel):
    """Pre-computed KBLI-to-zone compatibility matrix."""

    kbli_code = models.CharField(max_length=10, db_index=True)
    kbli_name = models.CharField(max_length=300)
    zone = models.ForeignKey(RDTRZone, on_delete=models.CASCADE, related_name="kbli_compat")
    is_compatible = models.BooleanField(default=True)
    requires_special_permit = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [("kbli_code", "zone")]
        ordering = ["kbli_code"]

    def __str__(self):
        status = "✓" if self.is_compatible else "✗"
        return f"{status} KBLI {self.kbli_code} @ {self.zone.zone_code}"
