"""
Regression tests for the engine-builder review fixes.

  F1 — in-flight submissions advance along their FROZEN snapshot, never the
       live config (no misrouting, no silent auto-approve on a deleted stage).
  F2 — renaming a stage / izin / sektor key cascades to RBAC permission strings.
  F3 — an izin cannot be published until it is operable (stages + terminal + SLA + fields).
  F4 — reordering stages/fields is collision-safe against the unique (permit_type, order).

Run with:  pytest apps/engine/test_builder_review.py -v
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import (
    Role,
    RolePermission,
    User,
    UserRole,
    VerifierPermitAssignment,
)
from apps.engine.models import FormField, PermitType, Sektor, WorkflowStage
from apps.engine.serializers import PermitTypeDetailSerializer
from apps.submissions.models import Submission

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def sektor(db):
    return Sektor.objects.create(key="sosial", name="Sosial", order=1)


@pytest.fixture
def permit_type(sektor):
    pt = PermitType.objects.create(
        sektor=sektor, key="izin-kegiatan", name="Izin Kegiatan Sosial", sla_days=8
    )
    WorkflowStage.objects.create(
        permit_type=pt,
        key="verifikasi",
        order=1,
        name="Verifikasi",
        stage_type=WorkflowStage.StageType.VERIFICATION,
        actor_role="verifier",
        sla_hours=40,
        allowed_actions=["approve", "revise", "reject"],
    )
    WorkflowStage.objects.create(
        permit_type=pt,
        key="penerbitan",
        order=2,
        name="Penerbitan",
        stage_type=WorkflowStage.StageType.PUBLISH,
        actor_role="verifier",
        sla_hours=8,
        allowed_actions=["generate", "publish"],
        is_terminal=True,
    )
    FormField.objects.create(
        permit_type=pt,
        key="nama_kegiatan",
        label="Nama Kegiatan",
        field_type=FormField.FieldType.TEXT,
        order=1,
        required=True,
    )
    return pt


@pytest.fixture
def applicant(db):
    return User.objects.create_user(
        email="applicant@test.lantara.id", password="x", full_name="Pemohon"
    )


@pytest.fixture
def verifier(db, permit_type):
    u = User.objects.create_user(
        email="verifier@test.lantara.id", password="x", full_name="Verifikator", is_staff=True
    )
    role, _ = Role.objects.get_or_create(key="verifier", defaults={"name": "Verifier"})
    UserRole.objects.create(user=u, role=role)
    VerifierPermitAssignment.objects.create(user=u, permit_type=permit_type)
    return u


@pytest.fixture
def admin_user(db):
    u = User.objects.create_user(
        email="admin@test.lantara.id",
        password="x",
        full_name="Admin",
        is_staff=True,
        is_superuser=True,
    )
    return u


def _make_inflight_submission(applicant, pt):
    """Submission frozen against pt's current schema, sitting at the first stage."""
    snap = PermitTypeDetailSerializer(pt).data
    stages = sorted(snap["stages"], key=lambda s: s["order"])
    first = next(s for s in stages if s["actor_role"] != "applicant")
    return Submission.objects.create(
        applicant=applicant,
        permit_type=pt,
        form_data={"nama_kegiatan": "Festival Budaya IKN"},
        schema_version_snapshot=pt.schema_version,
        schema_snapshot=snap,
        status=Submission.Status.IN_REVIEW,
        current_stage_key=first["key"],
        current_stage_order=first["order"],
        submitted_at=timezone.now(),
        stage_entered_at=timezone.now(),
    )


# ── F1: snapshot-driven transitions ──────────────────────────────────────────


@pytest.mark.django_db
class TestSnapshotDrivenTransitions:
    def test_get_workflow_stages_reads_snapshot_not_live(self, applicant, permit_type):
        sub = _make_inflight_submission(applicant, permit_type)
        # Mutate live config drastically.
        permit_type.stages.all().delete()
        WorkflowStage.objects.create(
            permit_type=permit_type,
            key="totally-different",
            order=1,
            name="X",
            stage_type=WorkflowStage.StageType.VERIFICATION,
        )
        keys = [s["key"] for s in sub.get_workflow_stages()]
        assert keys == ["verifikasi", "penerbitan"]  # frozen, not the live "totally-different"

    def test_approve_advances_along_snapshot_after_live_reorder(
        self, client_for, applicant, permit_type, verifier
    ):
        sub = _make_inflight_submission(applicant, permit_type)
        # Admin reorders live stages (penerbitan now first).
        WorkflowStage.objects.filter(permit_type=permit_type, key="verifikasi").update(order=9)
        client = client_for(verifier)
        resp = client.post(
            f"/api/v1/submissions/{sub.id}/act/", {"action": "approve"}, format="json"
        )
        assert resp.status_code == 200
        sub.refresh_from_db()
        # Snapshot order is verifikasi(1) → penerbitan(2): must land on penerbitan.
        assert sub.current_stage_key == "penerbitan"
        assert sub.status == Submission.Status.PUBLISHING

    def test_approve_does_not_autoapprove_when_live_current_stage_deleted(
        self, client_for, applicant, permit_type, verifier
    ):
        sub = _make_inflight_submission(applicant, permit_type)
        # Admin deletes the live stage the submission currently sits on.
        WorkflowStage.objects.filter(permit_type=permit_type, key="verifikasi").delete()
        client = client_for(verifier)
        resp = client.post(
            f"/api/v1/submissions/{sub.id}/act/", {"action": "approve"}, format="json"
        )
        assert resp.status_code == 200
        sub.refresh_from_db()
        # Must advance to the next *frozen* stage, NOT silently jump to approved.
        assert sub.current_stage_key == "penerbitan"
        assert sub.status != Submission.Status.APPROVED


# ── F2: RBAC key cascade ─────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRbacKeyCascade:
    def test_rename_stage_key_cascades_permission(self, permit_type):
        role = Role.objects.create(key="r-verif", name="Verif")
        RolePermission.objects.create(role=role, permission_key="verifikasi:izin-kegiatan")
        stage = WorkflowStage.objects.get(permit_type=permit_type, key="verifikasi")
        stage.key = "pra-verifikasi"
        stage.save()
        assert RolePermission.objects.filter(permission_key="pra-verifikasi:izin-kegiatan").exists()
        assert not RolePermission.objects.filter(permission_key="verifikasi:izin-kegiatan").exists()

    def test_rename_permit_key_cascades_permission_suffix(self, permit_type):
        role = Role.objects.create(key="r-verif", name="Verif")
        RolePermission.objects.create(role=role, permission_key="verifikasi:izin-kegiatan")
        permit_type.key = "izin-baru"
        permit_type.save()
        assert RolePermission.objects.filter(permission_key="verifikasi:izin-baru").exists()

    def test_rename_sektor_key_cascades_role_and_permission(self, sektor):
        Role.objects.create(key="sektor_admin:sosial", name="Admin Sosial")
        rp_role = Role.objects.create(key="r-x", name="X")
        RolePermission.objects.create(role=rp_role, permission_key="sektor_admin:sosial")
        sektor.key = "sosial-baru"
        sektor.save()
        assert Role.objects.filter(key="sektor_admin:sosial-baru").exists()
        assert RolePermission.objects.filter(permission_key="sektor_admin:sosial-baru").exists()


# ── F3: publish readiness gate ───────────────────────────────────────────────


@pytest.mark.django_db
class TestPublishGate:
    def test_publish_rejected_without_stages(self, client_for, sektor, admin_user):
        pt = PermitType.objects.create(sektor=sektor, key="kosong", name="Izin Kosong", sla_days=5)
        FormField.objects.create(
            permit_type=pt, key="f", label="F", field_type=FormField.FieldType.TEXT, order=1
        )
        client = client_for(admin_user)
        resp = client.post(f"/api/v1/admin/engine/permit-types/{pt.key}/publish/")
        assert resp.status_code == 400
        assert "stages" in resp.data["errors"]
        pt.refresh_from_db()
        assert pt.is_published is False

    def test_publish_succeeds_when_ready(self, client_for, permit_type, admin_user):
        client = client_for(admin_user)
        resp = client.post(f"/api/v1/admin/engine/permit-types/{permit_type.key}/publish/")
        assert resp.status_code == 200
        permit_type.refresh_from_db()
        assert permit_type.is_published is True


# ── F4: reorder collision safety ─────────────────────────────────────────────


@pytest.mark.django_db
class TestReorderCollisionSafe:
    def test_swap_stage_orders_does_not_raise(self, client_for, permit_type, admin_user):
        s1 = WorkflowStage.objects.get(permit_type=permit_type, key="verifikasi")
        s2 = WorkflowStage.objects.get(permit_type=permit_type, key="penerbitan")
        client = client_for(admin_user)
        # Swap their orders — would violate unique(permit_type, order) without two-phase.
        resp = client.post(
            f"/api/v1/admin/engine/permit-types/{permit_type.key}/stages/reorder/",
            [{"id": str(s1.id), "order": 2}, {"id": str(s2.id), "order": 1}],
            format="json",
        )
        assert resp.status_code == 200
        s1.refresh_from_db()
        s2.refresh_from_db()
        assert s1.order == 2
        assert s2.order == 1


@pytest.fixture
def client_for():
    def _make(user):
        c = APIClient()
        c.force_authenticate(user=user)
        return c

    return _make
