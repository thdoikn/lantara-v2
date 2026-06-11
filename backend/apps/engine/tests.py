"""
Engine tests — schema validation, WorkflowStage ordering,
FormField/DocumentRequirement behavior, schema_version immutability.

Run with:  pytest apps/engine/tests.py -v
"""
import pytest

from apps.engine.models import (
    DocumentRequirement,
    FormField,
    PermitType,
    PermitTypeVersion,
    Sektor,
    WorkflowStage,
)


@pytest.fixture
def sektor(db):
    return Sektor.objects.create(key="sosial", name="Sosial", order=1)


@pytest.fixture
def permit_type(sektor):
    return PermitType.objects.create(
        sektor=sektor,
        key="izin-kegiatan-sosial",
        name="Izin Kegiatan Sosial",
        sla_days=8,
    )


@pytest.fixture
def stages(permit_type):
    s1 = WorkflowStage.objects.create(
        permit_type=permit_type,
        key="tim-teknis",
        order=1,
        name="Verifikasi Tim Teknis",
        stage_type=WorkflowStage.StageType.VERIFICATION,
        sla_hours=40,
        allowed_actions=["approve", "revise", "reject"],
    )
    s2 = WorkflowStage.objects.create(
        permit_type=permit_type,
        key="kunjungan-lapangan",
        order=2,
        name="Kunjungan Lapangan",
        stage_type=WorkflowStage.StageType.VERIFICATION,
        sla_hours=16,
        requires_site_visit=True,
        allowed_actions=["approve", "revise"],
    )
    s3 = WorkflowStage.objects.create(
        permit_type=permit_type,
        key="penerbitan",
        order=3,
        name="Penerbitan",
        stage_type=WorkflowStage.StageType.PUBLISH,
        sla_hours=8,
        allowed_actions=["generate", "sign", "publish"],
        is_terminal=True,
    )
    return [s1, s2, s3]


@pytest.fixture
def form_fields(permit_type):
    f1 = FormField.objects.create(
        permit_type=permit_type,
        key="nama_kegiatan",
        label="Nama Kegiatan",
        field_type=FormField.FieldType.TEXT,
        order=1,
        required=True,
    )
    f2 = FormField.objects.create(
        permit_type=permit_type,
        key="jumlah_peserta",
        label="Jumlah Peserta",
        field_type=FormField.FieldType.NUMBER,
        order=2,
        required=True,
        validation_json={"min": 1, "max": 100000},
    )
    f3 = FormField.objects.create(
        permit_type=permit_type,
        key="lokasi",
        label="Lokasi Kegiatan",
        field_type=FormField.FieldType.TEXTAREA,
        order=3,
        required=True,
    )
    f4 = FormField.objects.create(
        permit_type=permit_type,
        key="kontak_pic",
        label="Kontak PIC",
        field_type=FormField.FieldType.PHONE,
        order=4,
        required=False,
    )
    return [f1, f2, f3, f4]


@pytest.fixture
def doc_requirements(permit_type):
    d1 = DocumentRequirement.objects.create(
        permit_type=permit_type,
        key="ktp-pemohon",
        title="KTP Pemohon",
        allowed_types=["pdf", "jpg", "png"],
        max_bytes=5 * 1024 * 1024,
        required=True,
        order=1,
    )
    d2 = DocumentRequirement.objects.create(
        permit_type=permit_type,
        key="surat-permohonan",
        title="Surat Permohonan",
        allowed_types=["pdf"],
        max_bytes=10 * 1024 * 1024,
        required=True,
        order=2,
    )
    d3 = DocumentRequirement.objects.create(
        permit_type=permit_type,
        key="proposal",
        title="Proposal Kegiatan",
        allowed_types=["pdf", "docx"],
        required=True,
        order=3,
        conditional_field_key="jumlah_peserta",
        conditional_field_value="",
    )
    return [d1, d2, d3]


# ──────────────────────────────────────────────────────────────────────────────
# 1. Sektor & PermitType basics
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPermitTypeBasics:
    def test_unique_key_constraint(self, sektor):
        PermitType.objects.create(sektor=sektor, key="izin-a", name="Izin A", sla_days=5)
        with pytest.raises(Exception):
            PermitType.objects.create(sektor=sektor, key="izin-a", name="Izin A Dup", sla_days=5)

    def test_sektor_str(self, sektor):
        assert str(sektor) == "Sosial"

    def test_permit_type_str(self, permit_type):
        assert "sosial" in str(permit_type)
        assert "Izin Kegiatan Sosial" in str(permit_type)

    def test_default_schema_version_is_one(self, permit_type):
        assert permit_type.schema_version == 1

    def test_schema_version_bump(self, permit_type):
        permit_type.schema_version = 2
        permit_type.save(update_fields=["schema_version"])
        permit_type.refresh_from_db()
        assert permit_type.schema_version == 2


# ──────────────────────────────────────────────────────────────────────────────
# 2. WorkflowStage ordering
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestWorkflowStageOrdering:
    def test_stages_ordered_by_order_field(self, stages, permit_type):
        ordered = list(
            WorkflowStage.objects.filter(permit_type=permit_type).values_list("key", flat=True)
        )
        assert ordered == ["tim-teknis", "kunjungan-lapangan", "penerbitan"]

    def test_unique_order_per_permit_type(self, permit_type):
        WorkflowStage.objects.create(
            permit_type=permit_type, key="s-a", order=10, name="A",
            stage_type=WorkflowStage.StageType.VERIFICATION,
        )
        with pytest.raises(Exception):
            WorkflowStage.objects.create(
                permit_type=permit_type, key="s-b", order=10, name="B",
                stage_type=WorkflowStage.StageType.VERIFICATION,
            )

    def test_terminal_stage_flag(self, stages):
        terminal = [s for s in stages if s.is_terminal]
        assert len(terminal) == 1
        assert terminal[0].key == "penerbitan"

    def test_site_visit_stage_flag(self, stages):
        visit = [s for s in stages if s.requires_site_visit]
        assert len(visit) == 1
        assert visit[0].key == "kunjungan-lapangan"

    def test_allowed_actions_stored(self, stages):
        stage = stages[0]
        assert "approve" in stage.allowed_actions
        assert "revise" in stage.allowed_actions
        assert "reject" in stage.allowed_actions

    def test_different_permit_types_can_share_same_order(self, sektor):
        pt2 = PermitType.objects.create(sektor=sektor, key="izin-b", name="Izin B", sla_days=5)
        pt3 = PermitType.objects.create(sektor=sektor, key="izin-c", name="Izin C", sla_days=5)
        WorkflowStage.objects.create(
            permit_type=pt2, key="verif", order=1, name="V",
            stage_type=WorkflowStage.StageType.VERIFICATION,
        )
        WorkflowStage.objects.create(
            permit_type=pt3, key="verif", order=1, name="V",
            stage_type=WorkflowStage.StageType.VERIFICATION,
        )
        assert WorkflowStage.objects.filter(order=1).count() >= 2

    def test_next_stage_derived_from_order(self, stages, permit_type):
        first = WorkflowStage.objects.filter(permit_type=permit_type).order_by("order").first()
        assert first.key == "tim-teknis"
        next_stage = (
            WorkflowStage.objects.filter(permit_type=permit_type, order__gt=first.order)
            .order_by("order")
            .first()
        )
        assert next_stage.key == "kunjungan-lapangan"


# ──────────────────────────────────────────────────────────────────────────────
# 3. FormField schema
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFormFieldSchema:
    def test_form_fields_ordered_by_order(self, form_fields, permit_type):
        keys = list(
            FormField.objects.filter(permit_type=permit_type).values_list("key", flat=True)
        )
        assert keys == ["nama_kegiatan", "jumlah_peserta", "lokasi", "kontak_pic"]

    def test_required_vs_optional(self, form_fields):
        required = [f for f in form_fields if f.required]
        optional = [f for f in form_fields if not f.required]
        assert len(required) == 3
        assert len(optional) == 1
        assert optional[0].key == "kontak_pic"

    def test_validation_json_stored(self, form_fields):
        number_field = next(f for f in form_fields if f.key == "jumlah_peserta")
        assert number_field.validation_json["min"] == 1
        assert number_field.validation_json["max"] == 100000

    def test_field_type_choices(self, form_fields):
        types = {f.field_type for f in form_fields}
        assert types == {
            FormField.FieldType.TEXT,
            FormField.FieldType.NUMBER,
            FormField.FieldType.TEXTAREA,
            FormField.FieldType.PHONE,
        }

    def test_unique_key_per_permit_type(self, permit_type, form_fields):
        with pytest.raises(Exception):
            FormField.objects.create(
                permit_type=permit_type,
                key="nama_kegiatan",  # duplicate
                label="Dup",
                field_type=FormField.FieldType.TEXT,
                order=99,
            )

    def test_required_fields_are_identifiable(self, form_fields, permit_type):
        required_keys = set(
            FormField.objects.filter(permit_type=permit_type, required=True)
            .values_list("key", flat=True)
        )
        assert "nama_kegiatan" in required_keys
        assert "jumlah_peserta" in required_keys
        assert "kontak_pic" not in required_keys


# ──────────────────────────────────────────────────────────────────────────────
# 4. DocumentRequirement
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDocumentRequirement:
    def test_allowed_types_stored(self, doc_requirements):
        ktp = next(d for d in doc_requirements if d.key == "ktp-pemohon")
        assert "pdf" in ktp.allowed_types
        assert "jpg" in ktp.allowed_types
        assert "png" in ktp.allowed_types

    def test_max_bytes_default(self, doc_requirements):
        ktp = next(d for d in doc_requirements if d.key == "ktp-pemohon")
        assert ktp.max_bytes == 5 * 1024 * 1024

    def test_pdf_only_requirement(self, doc_requirements):
        surat = next(d for d in doc_requirements if d.key == "surat-permohonan")
        assert surat.allowed_types == ["pdf"]

    def test_conditional_doc_fields(self, doc_requirements):
        proposal = next(d for d in doc_requirements if d.key == "proposal")
        assert proposal.conditional_field_key == "jumlah_peserta"

    def test_required_doc_count(self, doc_requirements, permit_type):
        required = DocumentRequirement.objects.filter(
            permit_type=permit_type, required=True
        ).count()
        assert required == 3

    def test_unique_key_per_permit_type(self, permit_type, doc_requirements):
        with pytest.raises(Exception):
            DocumentRequirement.objects.create(
                permit_type=permit_type,
                key="ktp-pemohon",  # duplicate
                title="Dup",
                order=99,
            )


# ──────────────────────────────────────────────────────────────────────────────
# 5. Schema version snapshot immutability
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSchemaVersionSnapshot:
    def test_create_version_snapshot(self, permit_type, stages, form_fields, doc_requirements):
        snapshot = {
            "version": permit_type.schema_version,
            "stages": [
                {"key": s.key, "name": s.name, "order": s.order}
                for s in WorkflowStage.objects.filter(permit_type=permit_type).order_by("order")
            ],
            "fields": [
                {"key": f.key, "required": f.required, "field_type": f.field_type}
                for f in FormField.objects.filter(permit_type=permit_type).order_by("order")
            ],
            "doc_requirements": [
                {"key": d.key, "required": d.required}
                for d in DocumentRequirement.objects.filter(permit_type=permit_type).order_by("order")
            ],
        }
        pv = PermitTypeVersion.objects.create(
            permit_type=permit_type,
            version=permit_type.schema_version,
            snapshot=snapshot,
        )
        assert pv.version == 1
        assert len(pv.snapshot["stages"]) == 3
        assert len(pv.snapshot["fields"]) == 4
        assert len(pv.snapshot["doc_requirements"]) == 3

    def test_schema_version_bump_creates_new_version(self, permit_type):
        v1_snap = {"fields": [], "stages": [], "doc_requirements": [], "version": 1}
        PermitTypeVersion.objects.create(permit_type=permit_type, version=1, snapshot=v1_snap)
        permit_type.schema_version = 2
        permit_type.save(update_fields=["schema_version"])

        v2_snap = {"fields": [{"key": "new_field"}], "stages": [], "doc_requirements": [], "version": 2}
        PermitTypeVersion.objects.create(permit_type=permit_type, version=2, snapshot=v2_snap)

        versions = list(
            PermitTypeVersion.objects.filter(permit_type=permit_type)
            .order_by("version")
            .values_list("version", flat=True)
        )
        assert versions == [1, 2]

    def test_old_snapshot_unchanged_after_live_edit(self, permit_type, form_fields):
        snapshot_before = {
            "fields": [{"key": f.key} for f in form_fields],
            "stages": [],
            "doc_requirements": [],
            "version": 1,
        }
        pv = PermitTypeVersion.objects.create(
            permit_type=permit_type, version=1, snapshot=snapshot_before
        )
        # Simulate admin editing a field after snapshot
        f = form_fields[0]
        f.label = "CHANGED LABEL"
        f.save(update_fields=["label"])

        pv.refresh_from_db()
        assert pv.snapshot["fields"][0]["key"] == "nama_kegiatan"

    def test_unique_version_per_permit_type(self, permit_type):
        snap = {"fields": [], "stages": [], "doc_requirements": [], "version": 1}
        PermitTypeVersion.objects.create(permit_type=permit_type, version=1, snapshot=snap)
        with pytest.raises(Exception):
            PermitTypeVersion.objects.create(
                permit_type=permit_type, version=1, snapshot=snap
            )


# ──────────────────────────────────────────────────────────────────────────────
# 6. Dynamic engine invariant: no per-type branching needed
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDynamicEngine:
    def test_all_stages_derived_from_db(self, stages, permit_type):
        db_stages = list(
            WorkflowStage.objects.filter(permit_type=permit_type).order_by("order")
        )
        assert len(db_stages) == 3
        assert db_stages[0].order == 1

    def test_first_stage_key_from_db(self, stages, permit_type):
        first = WorkflowStage.objects.filter(permit_type=permit_type).order_by("order").first()
        assert first is not None
        assert first.key == "tim-teknis"

    def test_required_form_fields_schema(self, form_fields, permit_type):
        required_keys = set(
            FormField.objects.filter(permit_type=permit_type, required=True)
            .values_list("key", flat=True)
        )
        mock_form_data = {
            "nama_kegiatan": "Festival Budaya",
            "jumlah_peserta": 500,
            "lokasi": "Titik Nol IKN",
        }
        missing = required_keys - set(mock_form_data.keys())
        assert missing == set()

    def test_missing_required_field_detected(self, form_fields, permit_type):
        required_keys = set(
            FormField.objects.filter(permit_type=permit_type, required=True)
            .values_list("key", flat=True)
        )
        mock_form_data = {"nama_kegiatan": "Festival"}  # missing jumlah_peserta and lokasi
        missing = required_keys - set(mock_form_data.keys())
        assert "jumlah_peserta" in missing
        assert "lokasi" in missing

    def test_multiple_permit_types_independent_stages(self, sektor):
        pt_a = PermitType.objects.create(sektor=sektor, key="izin-x", name="Izin X", sla_days=5)
        pt_b = PermitType.objects.create(sektor=sektor, key="izin-y", name="Izin Y", sla_days=8)

        WorkflowStage.objects.create(
            permit_type=pt_a, key="verif", order=1, name="Verif",
            stage_type=WorkflowStage.StageType.VERIFICATION,
        )
        WorkflowStage.objects.create(
            permit_type=pt_b, key="verif", order=1, name="Verif",
            stage_type=WorkflowStage.StageType.VERIFICATION,
        )
        WorkflowStage.objects.create(
            permit_type=pt_b, key="publish", order=2, name="Publish",
            stage_type=WorkflowStage.StageType.PUBLISH,
        )

        assert WorkflowStage.objects.filter(permit_type=pt_a).count() == 1
        assert WorkflowStage.objects.filter(permit_type=pt_b).count() == 2
