"""Antrean RBAC — two portals, Instansi/Loket-scoped.

Roles (assigned via accounts.UserRole; scope via CounterStaffAssignment):
  - tenant_admin   → Tenant Portal. Manages assigned tenant(s): lokets, settings,
    service quotas; assigns loket operators. Assigned by an OIKN admin.
  - loket_operator → Loket Portal. Works assigned counter(s).

Global superadmin/admin pass every check (superadmin can access everything).
"""

from rest_framework.permissions import BasePermission


def _is_global_admin(user) -> bool:
    return bool(user and user.is_authenticated and user.has_any_role("superadmin", "admin"))


class IsLoketOperator(BasePermission):
    """Counter operator (or any global admin, or a tenant admin)."""

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        return _is_global_admin(u) or u.has_any_role("loket_operator", "tenant_admin")


class IsTenantAdmin(BasePermission):
    """Tenant admin (or any global admin)."""

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        return _is_global_admin(u) or u.has_any_role("tenant_admin")


def tenant_admin_instansi_ids(user):
    """Instansi ids the user administers as tenant_admin (active). None = all
    (global admin)."""
    from .models import CounterStaffAssignment

    if _is_global_admin(user):
        return None
    return set(
        CounterStaffAssignment.objects.filter(
            user=user, is_active=True, role_scope=CounterStaffAssignment.Scope.TENANT_ADMIN
        ).values_list("instansi_id", flat=True)
    )


def user_scoped_instansi_ids(user, *, supervisor=False):
    """Instansi ids the user is attached to (any role_scope). None = all.
    ``supervisor=True`` restricts to tenant_admin scope."""
    from .models import CounterStaffAssignment

    if _is_global_admin(user):
        return None
    qs = CounterStaffAssignment.objects.filter(user=user, is_active=True)
    if supervisor:
        qs = qs.filter(role_scope=CounterStaffAssignment.Scope.TENANT_ADMIN)
    return set(qs.values_list("instansi_id", flat=True))


def user_can_administer_instansi(user, instansi) -> bool:
    """True if the user may manage a given tenant (global admin, or an active
    tenant_admin assignment to it)."""
    from .models import CounterStaffAssignment

    if _is_global_admin(user):
        return True
    return CounterStaffAssignment.objects.filter(
        user=user,
        is_active=True,
        instansi=instansi,
        role_scope=CounterStaffAssignment.Scope.TENANT_ADMIN,
    ).exists()


def user_can_operate_loket(user, loket) -> bool:
    """True if the user may work a given loket (global admin; the tenant's admin;
    or a loket_operator assigned to its instansi/loket)."""
    from .models import CounterStaffAssignment

    if _is_global_admin(user):
        return True
    qs = CounterStaffAssignment.objects.filter(
        user=user, is_active=True, instansi_id=loket.instansi_id
    )
    # tenant_admin for the instansi can operate any of its lokets.
    if qs.filter(role_scope=CounterStaffAssignment.Scope.TENANT_ADMIN).exists():
        return True
    ops = qs.filter(role_scope=CounterStaffAssignment.Scope.LOKET_OPERATOR)
    # An operator assignment with no loket = any loket in the instansi; else match.
    return ops.filter(loket__isnull=True).exists() or ops.filter(loket=loket).exists()
