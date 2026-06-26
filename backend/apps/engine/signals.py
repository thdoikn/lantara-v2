"""
RBAC key-sync signals.

RBAC permissions are encoded as strings derived from engine config:
  - stage permissions:  "{stage_key}:{izin_key}"   (RolePermission.permission_key)
  - sektor admin:       "sektor_admin:{sektor_key}" (Role.key AND RolePermission.permission_key)

When an admin renames a Stage / PermitType / Sektor key via the engine builder
(or Django admin, or the shell), those derived strings would otherwise go stale —
silently locking out previously-authorized staff. These pre_save receivers cascade
the rename so the derived permission strings stay in sync no matter the code path.

Note: the *primary* verifier authorization is VerifierPermitAssignment, which is an
FK to PermitType and therefore already immune to key renames. These receivers protect
the secondary stage-permission strings (used by the permits generate/publish endpoints).
"""

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import PermitType, Sektor, WorkflowStage


def _old_key(model, pk):
    return model.objects.filter(pk=pk).values_list("key", flat=True).first()


@receiver(pre_save, sender=WorkflowStage)
def sync_stage_permission_keys(sender, instance, **kwargs):
    """Stage key change → rewrite '{old}:{izin}' permission strings to '{new}:{izin}'."""
    if not instance.pk:
        return
    old = _old_key(WorkflowStage, instance.pk)
    if old is None or old == instance.key:
        return

    from apps.accounts.models import RolePermission

    izin_key = instance.permit_type.key
    RolePermission.objects.filter(permission_key=f"{old}:{izin_key}").update(
        permission_key=f"{instance.key}:{izin_key}"
    )


@receiver(pre_save, sender=PermitType)
def sync_permit_permission_keys(sender, instance, **kwargs):
    """Izin key change → rewrite the '{izin}' suffix of every stage permission string."""
    if not instance.pk:
        return
    old = _old_key(PermitType, instance.pk)
    if old is None or old == instance.key:
        return

    from apps.accounts.models import RolePermission

    for rp in RolePermission.objects.filter(permission_key__endswith=f":{old}"):
        stage_part = rp.permission_key.rsplit(":", 1)[0]
        rp.permission_key = f"{stage_part}:{instance.key}"
        rp.save(update_fields=["permission_key"])


@receiver(pre_save, sender=Sektor)
def sync_sektor_admin_keys(sender, instance, **kwargs):
    """Sektor key change → rewrite 'sektor_admin:{sektor}' in Role.key and RolePermission."""
    if not instance.pk:
        return
    old = _old_key(Sektor, instance.pk)
    if old is None or old == instance.key:
        return

    from apps.accounts.models import Role, RolePermission

    Role.objects.filter(key=f"sektor_admin:{old}").update(key=f"sektor_admin:{instance.key}")
    RolePermission.objects.filter(permission_key=f"sektor_admin:{old}").update(
        permission_key=f"sektor_admin:{instance.key}"
    )
