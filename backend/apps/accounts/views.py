from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.common.permissions import IsSuperAdmin

from .models import ApplicantProfile, OTPCode, Role, User, UserRole
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
)


class CustomTokenObtainView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

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

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            return Response({"detail": "Pengguna tidak ditemukan."}, status=404)

        otp = (
            OTPCode.objects.filter(
                user=user,
                purpose=data["purpose"],
                code=data["code"],
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )
        if not otp or not otp.is_valid():
            return Response({"detail": "Kode OTP tidak valid atau sudah kadaluarsa."}, status=400)

        otp.consume()
        if data["purpose"] == OTPCode.Purpose.EMAIL_VERIFY:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        return Response({"detail": "Verifikasi berhasil."})


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

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
        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            return Response({"detail": "Pengguna tidak ditemukan."}, status=404)

        otp = (
            OTPCode.objects.filter(
                user=user, purpose=OTPCode.Purpose.PASSWORD_RESET,
                code=data["code"], is_used=False,
            )
            .order_by("-created_at")
            .first()
        )
        if not otp or not otp.is_valid():
            return Response({"detail": "Kode tidak valid."}, status=400)

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
        serializer = UserMeSerializer(
            request.user, data=request.data, partial=True
        )
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


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """Superadmin only — list/retrieve roles."""

    permission_classes = [IsSuperAdmin]
    queryset = Role.objects.prefetch_related("permissions")
    serializer_class = RoleSerializer
    lookup_field = "key"


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Superadmin only — user management."""

    permission_classes = [IsSuperAdmin]
    queryset = User.objects.filter(is_deleted=False).order_by("-created_at")
    serializer_class = UserListSerializer
    filterset_fields = ["is_active", "is_staff", "is_email_verified"]
    search_fields = ["email", "full_name", "nik"]

    @action(detail=True, methods=["post"])
    def assign_role(self, request, pk=None):
        user = self.get_object()
        role_key = request.data.get("role_key", "")
        try:
            role = Role.objects.get(key=role_key)
        except Role.DoesNotExist:
            return Response({"detail": "Role tidak ditemukan."}, status=404)
        UserRole.objects.update_or_create(
            user=user, role=role,
            defaults={"is_active": True, "assigned_by": request.user},
        )
        return Response({"detail": "Role ditetapkan."})

    @action(detail=True, methods=["post"])
    def revoke_role(self, request, pk=None):
        user = self.get_object()
        role_key = request.data.get("role_key", "")
        UserRole.objects.filter(user=user, role__key=role_key).update(is_active=False)
        return Response({"detail": "Role dicabut."})


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
