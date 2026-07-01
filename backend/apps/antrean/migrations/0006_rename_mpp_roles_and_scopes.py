"""Rename the earlier mpp_* roles/scopes into the two-portal model.

Role:                 mpp_supervisor → tenant_admin,  mpp_operator → loket_operator
CounterStaffAssignment.role_scope:  supervisor → tenant_admin,  operator → loket_operator
"""

from django.db import migrations

ROLE_RENAMES = {
    "mpp_supervisor": ("tenant_admin", "Admin Tenant MPP"),
    "mpp_operator": ("loket_operator", "Petugas Loket MPP"),
}
SCOPE_RENAMES = {"supervisor": "tenant_admin", "operator": "loket_operator"}


def forwards(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    for old_key, (new_key, new_name) in ROLE_RENAMES.items():
        # If a target role already exists, drop the stale old one; else rename.
        if Role.objects.filter(key=new_key).exists():
            Role.objects.filter(key=old_key).delete()
        else:
            Role.objects.filter(key=old_key).update(key=new_key, name=new_name)

    Assignment = apps.get_model("antrean", "CounterStaffAssignment")
    for old, new in SCOPE_RENAMES.items():
        Assignment.objects.filter(role_scope=old).update(role_scope=new)


def backwards(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    for old_key, (new_key, _name) in ROLE_RENAMES.items():
        Role.objects.filter(key=new_key).update(key=old_key)
    Assignment = apps.get_model("antrean", "CounterStaffAssignment")
    for old, new in SCOPE_RENAMES.items():
        Assignment.objects.filter(role_scope=new).update(role_scope=old)


class Migration(migrations.Migration):
    dependencies = [
        ("antrean", "0005_alter_counterstaffassignment_role_scope"),
        ("accounts", "0005_verifierpermitassignment_stage_key"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
