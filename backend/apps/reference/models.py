"""
Reference data — KBLI master mapping and Indonesian public holiday calendar.
Loaded once via management commands; rarely updated.
"""
from django.db import models

from apps.common.models import TimestampedModel, UUIDModel


class Bidang(UUIDModel):
    """Top-level KBLI grouping (PP 27/2023)."""

    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class KbliCode(UUIDModel):
    """
    One row from SEKTOR_KBLI_2020.csv.
    Forward-filled BIDANG/SEKTOR within sektor groups.
    """

    bidang = models.ForeignKey(Bidang, on_delete=models.CASCADE, related_name="kbli_codes")
    sektor_oss_name = models.CharField(max_length=500, blank=True, help_text="SEKTOR (OSS)")
    code = models.CharField(max_length=10, db_index=True)
    title = models.CharField(max_length=500)
    verifier_sector = models.CharField(max_length=500, blank=True)
    lantara_izin_label = models.CharField(max_length=500, blank=True)
    pengampu = models.CharField(max_length=500, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "KBLI Code"
        verbose_name_plural = "KBLI Codes"

    def __str__(self):
        return f"{self.code} — {self.title}"


class Holiday(UUIDModel):
    """Indonesian public holiday + IKN-specific working calendar config."""

    date = models.DateField(unique=True)
    name = models.CharField(max_length=200)
    is_national = models.BooleanField(default=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.date} — {self.name}"


class DirectPermit(TimestampedModel):
    """
    Quick-access 'layanan langsung' cards shown on landing page.
    Admin-managed via engine builder.
    """

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    # Points to a PermitType key or an external URL
    permit_type_key = models.CharField(max_length=120, blank=True)
    external_url = models.URLField(blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class FAQ(TimestampedModel):
    question = models.CharField(max_length=500)
    answer = models.TextField()
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    category = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.question[:80]


class TenantCard(TimestampedModel):
    """MPP Digital tenant directory entry (Baznas, BRI, etc.) — FAQ/link only, no deep integration."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="tenants/", null=True, blank=True)
    website_url = models.URLField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class Kedeputian(TimestampedModel):
    """Eselon I unit of OIKN (Kedeputian or equivalent)."""

    key = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=300)
    short_name = models.CharField(max_length=100, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Kedeputian"
        verbose_name_plural = "Kedeputian"

    def __str__(self):
        return self.short_name or self.name


class Direktorat(TimestampedModel):
    """Eselon II unit of OIKN, under a Kedeputian."""

    kedeputian = models.ForeignKey(
        Kedeputian, on_delete=models.PROTECT, related_name="direktorat_list"
    )
    key = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=300)
    short_name = models.CharField(max_length=100, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["kedeputian__order", "order", "name"]
        verbose_name = "Direktorat"
        verbose_name_plural = "Direktorat"

    def __str__(self):
        return self.short_name or self.name
