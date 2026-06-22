"""
Permit engine — core configuration entities.

The golden rule: adding a new izin = inserting rows here, never a migration.
No per-permit-type tables, no if/elif on permit type anywhere.
"""
from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.common.models import TimestampedModel


class Sektor(TimestampedModel):
    key = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_catchall = models.BooleanField(
        default=False,
        help_text="True for the 'Lainnya' escape-hatch sektor",
    )
    pengampu = models.CharField(max_length=200, blank=True)
    pengampu_direktorat = models.ForeignKey(
        "reference.Direktorat",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pengampu_sektor",
        help_text="Direktorat OIKN yang bertanggung jawab atas sektor ini",
    )

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Sektor"
        verbose_name_plural = "Sektor"

    def __str__(self):
        return self.name


class PermitType(TimestampedModel):
    """
    One izin configuration. Workflow, fields, and requirements are child rows.
    Never columns on this model.
    """

    sektor = models.ForeignKey(Sektor, on_delete=models.PROTECT, related_name="permit_types")
    key = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    is_berusaha = models.BooleanField(default=False)
    oss_covered = models.BooleanField(
        default=False,
        help_text="If True route applicant to OSS — do NOT reimplement",
    )
    oss_deeplink = models.URLField(blank=True)
    sla_days = models.PositiveSmallIntegerField(help_text="Jangka Waktu Pelayanan")
    product_name = models.CharField(max_length=300, blank=True)
    legal_basis = ArrayField(models.TextField(), default=list)
    fee_description = models.TextField(blank=True)
    complaint_info = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    schema_version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["sektor__order", "name"]
        verbose_name = "Permit Type"
        verbose_name_plural = "Permit Types"

    def __str__(self):
        return f"{self.sektor.key} / {self.name}"


class PermitTypeVersion(TimestampedModel):
    """
    Immutable snapshot of a PermitType's full config at a given schema_version.
    In-flight submissions store their version number here so they are immune
    to live config edits.
    """

    permit_type = models.ForeignKey(
        PermitType, on_delete=models.CASCADE, related_name="versions"
    )
    version = models.PositiveIntegerField()
    snapshot = models.JSONField()

    class Meta:
        unique_together = [("permit_type", "version")]
        ordering = ["-version"]

    def __str__(self):
        return f"{self.permit_type.key} v{self.version}"


class WorkflowStage(TimestampedModel):
    """
    One processing step. Count varies per izin — drive everything from
    rows ordered by `order`. Never branch on permit_type.
    """

    class StageType(models.TextChoices):
        VERIFICATION = "verification", "Verifikasi"
        PAYMENT = "payment", "Pembayaran"
        EXTERNAL = "external", "Proses Eksternal"
        PUBLISH = "publish", "Penerbitan"
        COLLECTION = "collection", "Pengambilan"

    permit_type = models.ForeignKey(
        PermitType, on_delete=models.CASCADE, related_name="stages"
    )
    key = models.SlugField(max_length=120)
    order = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=200)
    stage_type = models.CharField(max_length=30, choices=StageType.choices)
    actor_role = models.CharField(max_length=200, blank=True)
    sla_hours = models.PositiveSmallIntegerField(default=0)
    requires_site_visit = models.BooleanField(default=False)
    allowed_actions = ArrayField(
        models.CharField(max_length=50),
        default=list,
        help_text="e.g. ['approve','revise','reject','generate','sign']",
    )
    is_terminal = models.BooleanField(default=False)
    instructions = models.TextField(blank=True)

    class Meta:
        unique_together = [("permit_type", "key"), ("permit_type", "order")]
        ordering = ["permit_type", "order"]
        verbose_name = "Workflow Stage"
        verbose_name_plural = "Workflow Stages"

    def __str__(self):
        return f"{self.permit_type.key} › {self.order}. {self.name}"


class FormField(TimestampedModel):
    """
    One field in the citizen-facing dynamic form.
    Frontend renders these from the API — never duplicate definitions in TS.
    """

    class FieldType(models.TextChoices):
        TEXT = "text", "Teks"
        TEXTAREA = "textarea", "Teks Panjang"
        NUMBER = "number", "Angka"
        DATE = "date", "Tanggal"
        SELECT = "select", "Pilihan Tunggal"
        MULTISELECT = "multiselect", "Pilihan Ganda"
        FILE = "file", "File"
        NIK = "nik", "NIK"
        NPWP = "npwp", "NPWP"
        PHONE = "phone", "Nomor Telepon"
        EMAIL_FIELD = "email", "Email"
        GEO = "geo", "Koordinat"
        MAP_POINT = "map_point", "Titik Peta"

    permit_type = models.ForeignKey(
        PermitType, on_delete=models.CASCADE, related_name="form_fields"
    )
    key = models.SlugField(max_length=120)
    label = models.CharField(max_length=300)
    field_type = models.CharField(max_length=30, choices=FieldType.choices)
    section = models.CharField(max_length=200, blank=True)
    order = models.PositiveSmallIntegerField()
    required = models.BooleanField(default=True)
    validation_json = models.JSONField(default=dict)
    options_json = models.JSONField(default=list)
    prefill_from_profile = models.BooleanField(default=False)
    help_text_field = models.TextField(blank=True)
    placeholder = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = [("permit_type", "key")]
        ordering = ["permit_type", "order"]
        verbose_name = "Form Field"
        verbose_name_plural = "Form Fields"

    def __str__(self):
        return f"{self.permit_type.key} › {self.label}"


class DocumentRequirement(TimestampedModel):
    """
    One document requirement (Persyaratan).
    Conditional requirements can depend on a FormField value.
    """

    permit_type = models.ForeignKey(
        PermitType, on_delete=models.CASCADE, related_name="doc_requirements"
    )
    key = models.SlugField(max_length=120)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    allowed_types = ArrayField(
        models.CharField(max_length=20),
        default=list,
        help_text="e.g. ['pdf','jpg','png']",
    )
    max_bytes = models.PositiveBigIntegerField(default=5 * 1024 * 1024)
    required = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)
    conditional_field_key = models.CharField(max_length=120, blank=True)
    conditional_field_value = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = [("permit_type", "key")]
        ordering = ["permit_type", "order"]
        verbose_name = "Document Requirement"
        verbose_name_plural = "Document Requirements"

    def __str__(self):
        return f"{self.permit_type.key} › {self.title}"
