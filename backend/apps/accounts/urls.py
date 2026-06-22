from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CustomTokenObtainView,
    MeView,
    OIDCCallbackView,
    OTPVerifyView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ResendOTPView,
    RoleViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("roles", RoleViewSet, basename="role")
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    # JWT (public / warga)
    path("token/", CustomTokenObtainView.as_view(), name="token-obtain"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # SSO (OIKN staff)
    path("oidc/callback/", OIDCCallbackView.as_view(), name="oidc-callback"),
    # Registration + OTP (public)
    path("register/", RegisterView.as_view(), name="register"),
    path("otp/verify/", OTPVerifyView.as_view(), name="otp-verify"),
    path("otp/resend/", ResendOTPView.as_view(), name="otp-resend"),
    # Password reset
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("password/change/", ChangePasswordView.as_view(), name="password-change"),
    # Profile
    path("me/", MeView.as_view(), name="me"),
    path("me/profile/", ProfileView.as_view(), name="profile"),
] + router.urls
