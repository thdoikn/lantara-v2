"""Publish-readiness rules for an izin — shared by the admin views (publish
validation) and the list serializer (so the UI can show a "not ready" badge
without drilling in). Prefetch-friendly: uses .all() so it reuses the queryset's
prefetched stages/form_fields rather than firing extra queries per row.
"""

from .models import WorkflowStage

TERMINAL_STAGE_TYPES = {
    WorkflowStage.StageType.PUBLISH,
    WorkflowStage.StageType.COLLECTION,
}


def publish_readiness_errors(pt) -> dict:
    """Return {field: message} for everything blocking publish; empty == ready."""
    errors: dict = {}

    stages = list(pt.stages.all())
    if not stages:
        errors["stages"] = "Tambahkan minimal satu tahap alur kerja."
    else:
        has_terminal = any(s.is_terminal or s.stage_type in TERMINAL_STAGE_TYPES for s in stages)
        if not has_terminal:
            errors["stages_terminal"] = (
                "Alur kerja harus punya tahap akhir (penerbitan/pengambilan "
                "atau ditandai sebagai tahap terminal)."
            )
        if not any(s.actor_role and s.actor_role != "applicant" for s in stages):
            errors["stages_actor"] = (
                "Minimal satu tahap harus memiliki aktor verifikator (actor_role)."
            )

    if not pt.sla_days or pt.sla_days <= 0:
        errors["sla_days"] = "Jangka waktu pelayanan (sla_days) harus lebih dari 0."

    if not list(pt.form_fields.all()):
        errors["form_fields"] = "Tambahkan minimal satu field formulir."

    return errors
