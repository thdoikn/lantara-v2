"""Dynamic RBAC permission classes resolved from engine config."""
from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Tighter throttle for auth endpoints (login, register, OTP)."""
    scope = "auth"


class IsEngineAdmin(BasePermission):
    """User has superadmin or sektor_admin role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_any_role("superadmin") or request.user.is_sektor_admin


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_any_role("superadmin")


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
