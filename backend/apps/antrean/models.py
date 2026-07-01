"""
Antrean MPP — physical/virtual queue for the Mal Pelayanan Publik (MPP) IKN.

A SEPARATE bounded context from the permit engine: minutes-long, presence-driven
counter service vs. the engine's days-long, document-driven izin workflow. A
``Loket`` is not a ``WorkflowStage``; the calling pool is not an SLA sweep.

Tenant-agnostic and fully standalone (its own ``Instansi``/``Layanan``): the MPP
serves any participating tenant — OIKN directorates AND external agencies (BPJS,
Pajak, banks…). It has NO coupling to the permit engine or submissions; online
izin is handled entirely online and never enters a queue.

Business rules come from the "Sistem Antrean MPP IKN" planning doc. Per its
Tabel 8, the numeric parameters are configurable (see ``QueueParameter`` and the
typed columns on ``Layanan``), not hard-coded — mirroring Lantara's golden rule.
"""

from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel

# Statuses where a ticket still "occupies" the one-active-per-day slot and a quota
# seat. Module-level so it is reachable from the Ticket.Meta constraint condition
# (class-body names are not visible inside a nested Meta scope).
ACTIVE_TICKET_STATUSES = ("reserved", "checked_in", "in_pool", "called", "serving")


class Instansi(TimestampedModel):
    """A participating MPP tenant that owns counters and services.

    Tenant-agnostic: NOT a foreign key to the permit engine. Tenants are either
    OIKN directorates (``owner_type=oikn``, grounded via ``direktorat``) or
    external agencies (``owner_type=external`` — BPJS, Pajak, banks…). External
    tenants get queue orchestration only; no downstream integration (CLAUDE.md §9).
    """

    class OwnerType(models.TextChoices):
        OIKN = "oikn", "Otorita IKN"
        EXTERNAL = "external", "Instansi Eksternal"

    key = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=300)
    short_name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    owner_type = models.CharField(max_length=10, choices=OwnerType.choices, default=OwnerType.OIKN)
    logo = models.ImageField(upload_to="mpp/tenants/", null=True, blank=True)
    # Only for OIKN tenants — the directorate that runs this counter.
    direktorat = models.ForeignKey(
        "reference.Direktorat",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="mpp_instansi",
    )
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Instansi MPP"
        verbose_name_plural = "Instansi MPP"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Layanan(TimestampedModel):
    """A service offered at an MPP counter (e.g. cetak KTP, ambil izin).

    The Tabel-8 numeric knobs live here as typed columns (primary source); the
    MPP-wide operational knobs live in ``QueueParameter``.
    """

    class Category(models.TextChoices):
        CEPAT = "cepat", "Cepat"
        SEDANG = "sedang", "Sedang"
        LAMA = "lama", "Lama"

    instansi = models.ForeignKey(Instansi, on_delete=models.PROTECT, related_name="layanan")
    key = models.SlugField(max_length=120)
    name = models.CharField(max_length=300)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.SEDANG)
    avg_minutes = models.PositiveSmallIntegerField(
        default=10, help_text="Rata-rata menit/layanan — basis estimasi waktu tunggu."
    )
    # Porsi online:walk-in (Tabel 8 → 60:40). walk-in share = 1 - online_ratio.
    online_ratio = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0.60"))
    # Rasio jalur prioritas: 1 prioritas : N reguler (Tabel 8 → 1:3).
    priority_ratio_n = models.PositiveSmallIntegerField(default=3)
    # Kuota harian; null = tak terbatas. Dibagi online/walk-in via online_ratio.
    daily_quota = models.PositiveIntegerField(null=True, blank=True)
    # Panggil ulang maksimal sebelum no-show (Tabel 8 → 2).
    recall_max = models.PositiveSmallIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Layanan Antrean"
        verbose_name_plural = "Layanan Antrean"
        unique_together = [("instansi", "key")]
        ordering = ["instansi", "order", "name"]

    def __str__(self):
        return f"{self.instansi.short_name or self.instansi.name} — {self.name}"


class QueueParameter(TimestampedModel):
    """Configurable Tabel-8 knobs (config-not-code).

    ``layanan`` null = MPP-wide default; otherwise a per-service override.
    Resolution order (service layer): typed ``Layanan`` column → per-layanan row
    → global row → hard-coded fallback.
    """

    class ValueType(models.TextChoices):
        INT = "int", "Integer"
        DECIMAL = "decimal", "Decimal"
        TIME = "time", "Time (HH:MM)"
        BOOL = "bool", "Boolean"

    layanan = models.ForeignKey(
        Layanan, null=True, blank=True, on_delete=models.CASCADE, related_name="parameters"
    )
    key = models.CharField(
        max_length=60,
        help_text=(
            "e.g. checkin_window_min, noshow_grace_min, operating_open, "
            "operating_close, cutoff_min, position_notify_threshold"
        ),
    )
    value = models.CharField(max_length=120)
    value_type = models.CharField(max_length=10, choices=ValueType.choices, default=ValueType.INT)

    class Meta:
        verbose_name = "Parameter Antrean"
        verbose_name_plural = "Parameter Antrean"
        unique_together = [("layanan", "key")]
        ordering = ["layanan", "key"]

    def __str__(self):
        scope = self.layanan.key if self.layanan_id else "global"
        return f"[{scope}] {self.key}={self.value}"


class Loket(TimestampedModel):
    """A physical service counter. Routes calls across the services it can serve."""

    instansi = models.ForeignKey(Instansi, on_delete=models.CASCADE, related_name="loket")
    code = models.CharField(max_length=20, help_text="Display label, e.g. 'Loket 3'.")
    name = models.CharField(max_length=100, blank=True)
    layanan = models.ManyToManyField(Layanan, blank=True, related_name="loket")
    is_open = models.BooleanField(default=False)
    current_operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="operating_loket",
    )
    opened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Loket"
        verbose_name_plural = "Loket"
        unique_together = [("instansi", "code")]
        ordering = ["instansi", "code"]

    def __str__(self):
        return f"{self.instansi.short_name or self.instansi.name} — {self.code}"


class Ticket(TimestampedModel):
    """One queue number for one citizen, for one service, on one day.

    Status lifecycle:
      reserved → checked_in → in_pool → called → serving → served
      (terminal off-ramps: no_show, expired, cancelled)

    Online tickets start ``reserved`` (taken remotely, not yet present) and enter
    the calling pool only on check-in. Walk-in tickets are checked in on issue.
    """

    class Channel(models.TextChoices):
        ONLINE = "online", "Online"
        WALKIN = "walkin", "Walk-in"

    class Status(models.TextChoices):
        RESERVED = "reserved", "Dipesan"
        CHECKED_IN = "checked_in", "Check-in"
        IN_POOL = "in_pool", "Dalam Kolam Panggil"
        CALLED = "called", "Dipanggil"
        SERVING = "serving", "Dilayani"
        SERVED = "served", "Selesai"
        NO_SHOW = "no_show", "Tidak Hadir"
        EXPIRED = "expired", "Kedaluwarsa"
        CANCELLED = "cancelled", "Dibatalkan"

    # NULL-applicant (anonymous walk-in) rows are exempt from the partial unique
    # constraint automatically (NULLs don't collide).
    ACTIVE_STATUSES = ACTIVE_TICKET_STATUSES

    layanan = models.ForeignKey(Layanan, on_delete=models.PROTECT, related_name="tickets")
    service_date = models.DateField(db_index=True)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    number = models.CharField(max_length=20, help_text="Display label, e.g. 'A-012'.")
    seq = models.PositiveIntegerField(help_text="Raw per-(layanan, service_date) sequence.")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.RESERVED, db_index=True
    )
    is_priority = models.BooleanField(default=False)

    # Timing — drives hybrid-guaranteed ordering and the check-in window.
    taken_at = models.DateTimeField()
    estimated_call_at = models.DateTimeField(null=True, blank=True)
    checkin_at = models.DateTimeField(null=True, blank=True)
    checkin_deadline = models.DateTimeField(null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    recall_count = models.PositiveSmallIntegerField(default=0)
    serving_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)

    # Demotion: when an online ticket misses its check-in window, it re-enters the
    # pool ordered by checkin_at instead of taken_at (loses the "menyalip" slot).
    is_demoted = models.BooleanField(default=False)
    # Dedup guard for "tinggal X lagi" notifications.
    last_notified_ahead = models.PositiveIntegerField(null=True, blank=True)

    loket = models.ForeignKey(
        Loket, null=True, blank=True, on_delete=models.SET_NULL, related_name="tickets"
    )
    served_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="served_tickets",
    )
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="antrean_tickets",
    )
    # For anonymous walk-in kiosk tickets (applicant null) + delivery.
    holder_name = models.CharField(max_length=200, blank=True)
    holder_phone = models.CharField(max_length=20, blank=True)
    holder_email = models.EmailField(blank=True)
    # Generated ticket PDF (number + QR), stored to MinIO.
    pdf_file = models.FileField(upload_to="mpp/tickets/", null=True, blank=True)
    triage_note = models.TextField(blank=True)

    @property
    def delivery_email(self) -> str:
        """Where to send the ticket: the logged-in applicant's email, else the
        email the walk-in visitor typed at the kiosk."""
        if self.applicant_id and self.applicant.email:
            return self.applicant.email
        return self.holder_email

    @property
    def checkin_url(self) -> str:
        """Payload encoded in the ticket QR (also a working deep link)."""
        from django.conf import settings

        base = getattr(settings, "FRONTEND_BASE_URL", "")
        return f"{base}/antrean/tiket/{self.id}"

    class Meta:
        verbose_name = "Tiket Antrean"
        verbose_name_plural = "Tiket Antrean"
        ordering = ["service_date", "seq"]
        constraints = [
            models.UniqueConstraint(
                fields=["layanan", "service_date", "seq"],
                name="uniq_ticket_seq_per_service_day",
            ),
            # Satu identitas hanya boleh punya satu nomor aktif per layanan/hari.
            models.UniqueConstraint(
                fields=["layanan", "service_date", "applicant"],
                condition=models.Q(status__in=ACTIVE_TICKET_STATUSES),
                name="uniq_active_ticket_per_service_day",
            ),
        ]
        indexes = [
            models.Index(fields=["layanan", "service_date", "status"]),
            models.Index(fields=["status", "estimated_call_at"]),
            models.Index(fields=["applicant", "status"]),
        ]

    def __str__(self):
        return f"{self.number} ({self.get_status_display()})"

    @property
    def effective_time(self):
        """Sort key for the calling pool: taken_at if the slot is guaranteed,
        else checkin_at (demoted — lost the right to jump ahead)."""
        if self.is_demoted and self.checkin_at:
            return self.checkin_at
        return self.taken_at


class TicketEvent(TimestampedModel):
    """Immutable audit trail for a ticket (mirrors submissions.AuditEntry)."""

    class Action(models.TextChoices):
        TAKE = "take", "Ambil Nomor"
        CHECK_IN = "check_in", "Check-in"
        DEMOTE = "demote", "Turun Posisi"
        CALL = "call", "Dipanggil"
        RECALL = "recall", "Panggil Ulang"
        SERVE = "serve", "Mulai Dilayani"
        COMPLETE = "complete", "Selesai Dilayani"
        NO_SHOW = "no_show", "Tidak Hadir"
        EXPIRE = "expire", "Kedaluwarsa"
        CANCEL = "cancel", "Dibatalkan"
        RETRIAGE = "retriage", "Koreksi Layanan"

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="events")
    action = models.CharField(max_length=20, choices=Action.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="antrean_events",
    )
    from_status = models.CharField(max_length=12, blank=True)
    to_status = models.CharField(max_length=12, blank=True)
    loket = models.ForeignKey(Loket, null=True, blank=True, on_delete=models.SET_NULL)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.ticket.number} — {self.action}"


class CounterStaffAssignment(TimestampedModel):
    """Scopes an MPP staff member to an Instansi (and optionally one Loket).

    Mirrors accounts.VerifierPermitAssignment, but scoped by Instansi/Loket
    instead of the engine's permit stages — antrean is engine-agnostic, so reusing
    RolePermission's '{stage}:{izin}' strings would overload their meaning.
    """

    class Scope(models.TextChoices):
        OPERATOR = "operator", "Petugas Loket"
        SUPERVISOR = "supervisor", "Supervisor MPP"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="counter_assignments"
    )
    instansi = models.ForeignKey(
        Instansi, on_delete=models.CASCADE, related_name="staff_assignments"
    )
    loket = models.ForeignKey(
        Loket,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="staff_assignments",
        help_text="Blank = any loket within the instansi.",
    )
    role_scope = models.CharField(max_length=12, choices=Scope.choices, default=Scope.OPERATOR)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="counter_assignments_given",
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Penugasan Petugas Loket"
        verbose_name_plural = "Penugasan Petugas Loket"
        unique_together = [("user", "instansi", "loket", "role_scope")]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self):
        scope = self.loket.code if self.loket_id else "*"
        return f"{self.user.email} → {self.instansi.key}:{scope} ({self.role_scope})"
