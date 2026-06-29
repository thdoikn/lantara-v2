"""Antrean RBAC — Instansi/Loket-scoped, distinct from the engine's stage perms.

MPP staff are scoped by Instansi (and optionally a single Loket) via
CounterStaffAssignment, mirroring accounts.VerifierPermitAssignment. Superadmin
and admin pass everything.
"""

from rest_framework.permissions import BasePermission


def _is_global_admin(user) -> bool:
    return bool(user and user.is_authenticated and user.has_any_role("superadmin", "admin"))


class IsMppOperator(BasePermission):
    """Counter officer (or any global admin)."""

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        return _is_global_admin(u) or u.has_any_role("mpp_operator", "mpp_supervisor")


class IsMppSupervisor(BasePermission):
    """MPP supervisor (or any global admin)."""

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        return _is_global_admin(u) or u.has_any_role("mpp_supervisor")


def user_scoped_instansi_ids(user, *, supervisor=False):
    """Instansi ids the user is assigned to (active). None = all (global admin)."""
    from .models import CounterStaffAssignment

    if _is_global_admin(user):
        return None
    qs = CounterStaffAssignment.objects.filter(user=user, is_active=True)
    if supervisor:
        qs = qs.filter(role_scope=CounterStaffAssignment.Scope.SUPERVISOR)
    return set(qs.values_list("instansi_id", flat=True))


def user_can_operate_loket(user, loket) -> bool:
    """True if the user may work a given loket (global admin, or an active
    assignment to its instansi — loket-specific if the assignment names one)."""
    from .models import CounterStaffAssignment

    if _is_global_admin(user):
        return True
    qs = CounterStaffAssignment.objects.filter(
        user=user, is_active=True, instansi_id=loket.instansi_id
    )
    # An assignment with no loket = any loket in the instansi; else must match.
    return qs.filter(loket__isnull=True).exists() or qs.filter(loket=loket).exists()
