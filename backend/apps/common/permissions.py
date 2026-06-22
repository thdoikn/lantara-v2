"""Dynamic RBAC permission classes resolved from engine config."""
from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Tighter throttle for auth endpoints (login, register, OTP)."""
    scope = "auth"


class IsEngineAdmin(BasePermission):
    """User has superadmin, admin, or sektor_admin role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.has_any_role("superadmin", "admin")
            or request.user.is_sektor_admin
        )


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_any_role("superadmin")


class IsAdminOrSuperAdmin(BasePermission):
    """User has admin or superadmin role — grants access to the admin portal."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_any_role("superadmin", "admin")


class IsAnyStaff(BasePermission):
    """
    User holds any OIKN staff role (superadmin, admin, or verifier).
    Grants entry to the verifier portal; what they see is filtered separately
    by VerifierPermitAssignment.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_any_role("superadmin", "admin", "verifier")


class HasStagePermission(BasePermission):
    """
    Checks that the requesting user holds the `{stage_key}:{izin_key}` permission
    for the submission's current stage. Attach `required_permission` to the view.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        perm = f"{obj.current_stage_key}:{obj.permit_type.key}"
        return request.user.has_stage_permission(perm)
