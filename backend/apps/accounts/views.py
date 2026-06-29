from django.conf import settings
from django.db.models import Case, F, IntegerField, Min, Value, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.permissions import AuthRateThrottle, IsAdminOrSuperAdmin, IsSuperAdmin

from .models import ApplicantProfile, OTPCode, Role, User, UserRole, VerifierPermitAssignment
from .serializers import (
    ApplicantProfileSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    OTPVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    RoleSerializer,
    UserListSerializer,
    UserMeSerializer,
    VerifierPermitAssignmentSerializer,
)


class CustomTokenObtainView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Create empty applicant profile
        ApplicantProfile.objects.get_or_create(user=user)
        # Send OTP
        otp = OTPCode.create_for(user, OTPCode.Purpose.EMAIL_VERIFY)
        _send_otp_email(user, otp.code)
        return Response(
            {"detail": "Registrasi berhasil. Cek email Anda untuk kode OTP."},
            status=status.HTTP_201_CREATED,
        )


class OTPVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        invalid = Response(
            {"detail": "Kode OTP tidak valid atau sudah kadaluarsa."}, status=400
        )
        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            # Generic response — do not disclose whether the account exists.
            return invalid

        otp = (
            OTPCode.objects.filter(user=user, purpose=data["purpose"], is_used=False)
            .order_by("-created_at")
            .first()
        )
        if not otp or not otp.is_valid():
            return invalid
        if otp.code != data["code"]:
            otp.register_attempt()
            return invalid

        otp.consume()
        if data["purpose"] == OTPCode.Purpose.EMAIL_VERIFY:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        return Response({"detail": "Verifikasi berhasil."})


class ResendOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get("email", "")
        purpose = request.data.get("purpose", OTPCode.Purpose.EMAIL_VERIFY)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "OK"})  # Don't reveal existence
        otp = OTPCode.create_for(user, purpose)
        _send_otp_email(user, otp.code)
        return Response({"detail": "Kode OTP baru telah dikirim."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=serializer.validated_data["email"])
            otp = OTPCode.create_for(user, OTPCode.Purpose.PASSWORD_RESET)
            _send_otp_email(user, otp.code, subject="Reset Password Lantara")
        except User.DoesNotExist:
            pass  # Silent — don't reveal account existence
        return Response({"detail": "Jika email terdaftar, kode reset telah dikirim."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        invalid = Response({"detail": "Kode tidak valid atau sudah kadaluarsa."}, status=400)
        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            # Generic response — do not disclose whether the account exists.
            return invalid

        otp = (
            OTPCode.objects.filter(
                user=user, purpose=OTPCode.Purpose.PASSWORD_RESET, is_used=False
            )
            .order_by("-created_at")
            .first()
        )
        if not otp or not otp.is_valid():
            return invalid
        if otp.code != data["code"]:
            otp.register_attempt()
            return invalid

        otp.consume()
        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password berhasil diubah."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request.user.last_seen = timezone.now()
        request.user.save(update_fields=["last_seen"])
        return Response(UserMeSerializer(request.user).data)

    def patch(self, request):
        serializer = UserMeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = ApplicantProfile.objects.get_or_create(user=request.user)
        return Response(ApplicantProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = ApplicantProfile.objects.get_or_create(user=request.user)
        serializer = ApplicantProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Mark complete if required fields filled
        _update_profile_completeness(profile)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "Password lama salah."}, status=400)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password berhasil diubah."})


class OIDCCallbackView(APIView):
    """
    POST /auth/oidc/callback/
    Body: { code, redirect_uri }

    Exchanges the Keycloak authorization code for tokens server-to-server,
    finds or creates the OIKN staff User from JWT claims, and returns
    our own SimpleJWT tokens in the same shape as normal login.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri")

        if not code:
            return Response({"detail": "code is required."}, status=400)
        if not redirect_uri:
            return Response({"detail": "redirect_uri is required."}, status=400)

        if not getattr(settings, "OIDC_RP_CLIENT_ID", ""):
            return Response({"detail": "SSO is not configured on this server."}, status=503)

        from .oidc import JDIHOIDCBackend

        backend = JDIHOIDCBackend()

        try:
            token_info = backend.get_token(
                {
                    "client_id": settings.OIDC_RP_CLIENT_ID,
                    "client_secret": settings.OIDC_RP_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                }
            )
            id_token = token_info.get("id_token")
            access_token = token_info.get("access_token")

            if not id_token:
                return Response({"detail": "id_token not received from SSO."}, status=400)

            payload = backend.verify_token(id_token, nonce=None)
            user = backend.get_or_create_user(access_token, id_token, payload)
        except Exception:
            # Do not leak internal error detail / token-exchange internals to the client.
            import logging

            logging.getLogger(__name__).warning("OIDC callback failed", exc_info=True)
            return Response({"detail": "SSO login gagal. Silakan coba lagi."}, status=400)

        if user is None:
            return Response({"detail": "Pengguna tidak ditemukan."}, status=403)
        if not user.is_active:
            return Response({"detail": "Akun tidak aktif."}, status=403)

        refresh = RefreshToken.for_user(user)
        # Embed same claims as CustomTokenObtainPairSerializer
        refresh["email"] = user.email
        refresh["full_name"] = user.full_name
        refresh["is_staff"] = user.is_staff

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserMeSerializer(user).data,
            }
        )


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """Superadmin only — list/retrieve roles."""

    permission_classes = [IsSuperAdmin]
    queryset = Role.objects.prefetch_related("permissions")
    serializer_class = RoleSerializer
    lookup_field = "key"


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin and superadmin — user management and verifier assignments."""

    permission_classes = [IsAdminOrSuperAdmin]
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = UserListSerializer
    filterset_fields = ["is_active", "is_staff", "is_email_verified"]
    search_fields = ["email", "full_name", "nik"]

    def get_queryset(self):
        # Sort by role priority (superadmin → admin → verifier → registered user),
        # then by most-recent login (never-logged-in last), then newest.
        return (
            User.objects.filter(is_deleted=False)
            .select_related("direktorat", "direktorat__kedeputian")
            .annotate(
                role_rank=Min(
                    Case(
                        When(
                            user_roles__role__key="superadmin",
                            user_roles__is_active=True,
                            then=Value(0),
                        ),
                        When(
                            user_roles__role__key="admin", user_roles__is_active=True, then=Value(1)
                        ),
                        When(
                            user_roles__role__key="verifier",
                            user_roles__is_active=True,
                            then=Value(2),
                        ),
                        default=Value(3),
                        output_field=IntegerField(),
                    )
                )
            )
            .order_by("role_rank", F("last_seen").desc(nulls_last=True), "-created_at")
        )

    @action(detail=True, methods=["post"])
    def assign_role(self, request, pk=None):
        role_key = request.data.get("role_key", "")
        # Superadmin is never granted through the UI — protects against privilege
        # escalation. Manage it via the bootstrap command / shell only.
        if role_key == "superadmin":
            return Response(
                {"detail": "Role superadmin tidak dapat ditetapkan melalui antarmuka."}, status=403
            )
        user = self.get_object()
        try:
            role = Role.objects.get(key=role_key)
        except Role.DoesNotExist:
            return Response({"detail": "Role tidak ditemukan."}, status=404)
        UserRole.objects.update_or_create(
            user=user,
            role=role,
            defaults={"is_active": True, "assigned_by": request.user},
        )
        return Response({"detail": "Role ditetapkan."})

    @action(detail=True, methods=["post"])
    def revoke_role(self, request, pk=None):
        role_key = request.data.get("role_key", "")
        # A superadmin can never be downgraded through the UI.
        if role_key == "superadmin":
            return Response(
                {"detail": "Role superadmin tidak dapat dicabut melalui antarmuka."}, status=403
            )
        user = self.get_object()
        UserRole.objects.filter(user=user, role__key=role_key).update(is_active=False)
        return Response({"detail": "Role dicabut."})

    @action(detail=True, methods=["get", "post"], url_path="assignments")
    def assignments(self, request, pk=None):
        """List or create permit assignments for a user."""
        user = self.get_object()
        if request.method == "GET":
            qs = VerifierPermitAssignment.objects.filter(user=user).select_related(
                "permit_type__sektor", "assigned_by"
            )
            return Response(VerifierPermitAssignmentSerializer(qs, many=True).data)

        serializer = VerifierPermitAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permit_type = serializer.validated_data["permit_type"]
        stage_key = serializer.validated_data.get("stage_key", "")
        assignment, created = VerifierPermitAssignment.objects.update_or_create(
            user=user,
            permit_type=permit_type,
            stage_key=stage_key,
            defaults={
                "is_active": True,
                "notes": serializer.validated_data.get("notes", ""),
                "assigned_by": request.user,
            },
        )
        return Response(
            VerifierPermitAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path=r"assignments/(?P<permit_type_key>[^/.]+)")
    def revoke_assignment(self, request, pk=None, permit_type_key=None):
        """Deactivate a permit assignment for a user.

        Pass ?stage=<key> to revoke only a stage-scoped assignment; omit it to
        revoke every assignment for this permit type.
        """
        user = self.get_object()
        qs = VerifierPermitAssignment.objects.filter(user=user, permit_type__key=permit_type_key)
        stage = request.query_params.get("stage")
        if stage is not None:
            qs = qs.filter(stage_key=stage)
        updated = qs.update(is_active=False)
        if not updated:
            return Response({"detail": "Penugasan tidak ditemukan."}, status=404)
        return Response({"detail": "Penugasan dicabut."})


# ── Helpers ────────────────────────────────────────────────────────────────────


def _send_otp_email(user, code, subject="Kode Verifikasi Lantara"):
    from django.core.mail import send_mail

    send_mail(
        subject=subject,
        message=f"Kode OTP Anda: {code}\nBerlaku 10 menit.",
        from_email=None,  # uses DEFAULT_FROM_EMAIL
        recipient_list=[user.email],
        fail_silently=True,
    )


def _update_profile_completeness(profile):
    required = ["birth_date", "gender", "address", "provinsi", "kabupaten_kota"]
    complete = all(getattr(profile, f) for f in required)
    if profile.profile_complete != complete:
        profile.profile_complete = complete
        profile.save(update_fields=["profile_complete"])
