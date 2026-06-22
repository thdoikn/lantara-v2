"""
Accounts — custom User, OTP, dynamic RBAC (Role/RolePermission/UserRole),
and verifier-to-perizinan assignments.

RBAC permissions are {stage_key}:{izin_key} strings derived from engine
config at request time, NOT a static Django permission enum.
"""
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.common.models import TimestampedModel, UUIDModel


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email wajib diisi")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_active", True)
        extra.setdefault("is_email_verified", True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin, UUIDModel):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    nik = models.CharField(max_length=16, blank=True, db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    whatsapp_verified = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # OIKN organizational placement — null for public (warga) users
    direktorat = models.ForeignKey(
        "reference.Direktorat",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_members",
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    class Meta:
        verbose_name = "Pengguna"
        verbose_name_plural = "Pengguna"

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    def has_any_role(self, *role_keys: str) -> bool:
        return self.user_roles.filter(role__key__in=role_keys, is_active=True).exists()

    @property
    def is_sektor_admin(self) -> bool:
        return self.user_roles.filter(
            role__key__startswith="sektor_admin:", is_active=True
        ).exists()

    def has_stage_permission(self, perm: str) -> bool:
        return RolePermission.objects.filter(
            role__user_roles__user=self,
            role__user_roles__is_active=True,
            permission_key=perm,
        ).exists()

    def get_permitted_stage_keys(self):
        return set(
            RolePermission.objects.filter(
                role__user_roles__user=self,
                role__user_roles__is_active=True,
            ).values_list("permission_key", flat=True)
        )


class ApplicantProfile(TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    birth_place = models.CharField(max_length=100, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Laki-laki"), ("female", "Perempuan")],
        blank=True,
    )
    religion = models.CharField(max_length=50, blank=True)
    npwp = models.CharField(max_length=20, blank=True)
    institution_name = models.CharField(max_length=300, blank=True)
    institution_type = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    rt_rw = models.CharField(max_length=20, blank=True)
    kelurahan = models.CharField(max_length=100, blank=True)
    kecamatan = models.CharField(max_length=100, blank=True)
    kabupaten_kota = models.CharField(max_length=100, blank=True)
    provinsi = models.CharField(max_length=100, blank=True)
    kode_pos = models.CharField(max_length=10, blank=True)
    profile_complete = models.BooleanField(default=False)

    def __str__(self):
        return f"Profil {self.user.email}"


class OTPCode(UUIDModel):
    class Purpose(models.TextChoices):
        EMAIL_VERIFY = "email_verify", "Verifikasi Email"
        PASSWORD_RESET = "password_reset", "Reset Password"
        WHATSAPP_VERIFY = "whatsapp_verify", "Verifikasi WhatsApp"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_codes")
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def create_for(cls, user, purpose, ttl_minutes=10):
        import random
        code = f"{random.randint(0, 999999):06d}"
        return cls.objects.create(
            user=user,
            purpose=purpose,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=ttl_minutes),
        )

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def consume(self):
        self.is_used = True
        self.save(update_fields=["is_used"])

    def __str__(self):
        return f"OTP {self.purpose} for {self.user.email}"


class Role(TimestampedModel):
    key = models.CharField(max_length=200, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.name


class RolePermission(UUIDModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="permissions")
    permission_key = models.CharField(
        max_length=300,
        help_text="'{stage_key}:{izin_key}' or 'sektor_admin:{sektor_key}'",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("role", "permission_key")]

    def __str__(self):
        return f"{self.role.key} → {self.permission_key}"


class UserRole(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="user_roles")
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="assigned_roles",
    )

    class Meta:
        unique_together = [("user", "role")]

    def __str__(self):
        return f"{self.user.email} → {self.role.key}"


class VerifierPermitAssignment(TimestampedModel):
    """
    Assigns a verifier (or admin) to a specific PermitType.
    Drives what submissions appear in the verifier's queue.
    A user with the 'verifier' role only sees permit types they are assigned to.
    Admins and superadmins see all regardless of assignments.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="permit_assignments"
    )
    permit_type = models.ForeignKey(
        "engine.PermitType", on_delete=models.CASCADE, related_name="verifier_assignments"
    )
    assigned_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="assignments_given",
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [("user", "permit_type")]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self):
        return f"{self.user.email} → {self.permit_type.key}"
