"""
Submissions API — applicant-facing (create/read/track) +
verifier-facing actions (approve/revise/reject).
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.engine.models import PermitType, WorkflowStage
from apps.engine.serializers import PermitTypeDetailSerializer

from .models import AuditEntry, Submission, SubmissionIndex, SubmissionRevisionField
from .serializers import (
    AuditEntrySerializer,
    SiteVisitSerializer,
    SubmissionActionSerializer,
    SubmissionCreateSerializer,
    SubmissionDetailSerializer,
    SubmissionListSerializer,
)
from .sla import compute_submission_sla


class SubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ["permit_type__sektor__key", "permit_type__key"]
    search_fields = ["reference_number", "applicant__full_name", "applicant__email"]
    ordering_fields = ["created_at", "submitted_at", "sla_due_at", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related(
            "permit_type__sektor", "applicant"
        ).prefetch_related("audit_entries", "revision_fields", "site_visits")

        # Applicants see only their own submissions
        if not user.is_staff and not user.is_sektor_admin and not user.has_any_role("superadmin"):
            qs = qs.filter(applicant=user)

        # Support comma-separated status filter: ?status=in_review,submitted
        status_param = self.request.query_params.get("status", "")
        if status_param:
            statuses = [s.strip() for s in status_param.split(",") if s.strip()]
            if statuses:
                qs = qs.filter(status__in=statuses)

        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("list",):
            return SubmissionListSerializer
        if self.action == "create":
            return SubmissionCreateSerializer
        return SubmissionDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        pt: PermitType = data["_permit_type"]

        # Snapshot the current schema version onto the submission
        schema_snapshot = PermitTypeDetailSerializer(pt).data

        sub = Submission.objects.create(
            applicant=request.user,
            permit_type=pt,
            form_data=data["form_data"],
            schema_version_snapshot=pt.schema_version,
            schema_snapshot=schema_snapshot,
            status=Submission.Status.SUBMITTED,
            submitted_at=timezone.now(),
            stage_entered_at=timezone.now(),
        )

        # Move to first verifier stage (skip applicant-role stages)
        stages = list(pt.stages.order_by("order"))
        first_stage = next(
            (s for s in stages if s.actor_role != "applicant"),
            stages[0] if stages else None,
        )
        if first_stage:
            sub.current_stage_key = first_stage.key
            sub.current_stage_order = first_stage.order
            sub.status = Submission.Status.IN_REVIEW

        compute_submission_sla(sub)
        sub.save()

        # Audit log
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.SUBMIT,
            actor=request.user,
            is_applicant_action=True,
            to_stage_key=sub.current_stage_key,
            to_status=sub.status,
        )

        _upsert_index(sub)
        _notify_submission(sub)

        return Response(SubmissionDetailSerializer(sub).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def act(self, request, pk=None):
        """Verifier action: approve / revise / reject."""
        sub = self.get_object()
        serializer = SubmissionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Check stage permission
        perm = f"{sub.current_stage_key}:{sub.permit_type.key}"
        if not request.user.is_staff and not request.user.has_stage_permission(perm):
            return Response({"detail": "Tidak memiliki izin untuk tahap ini."}, status=403)

        act = data["action"]
        notes = data.get("notes", "")

        if act == "approve":
            self._do_approve(sub, request.user, notes)
        elif act in ("revise", "request_revision"):
            self._do_revise(sub, request.user, notes, data.get("revision_fields", []))
        elif act == "reject":
            self._do_reject(sub, request.user, notes, data.get("rejection_reason", ""))
        elif act == "schedule_site_visit":
            AuditEntry.objects.create(
                submission=sub,
                action=AuditEntry.ActionType.VISIT_SCHEDULED,
                actor=request.user,
                notes=notes,
                from_stage_key=sub.current_stage_key,
                to_stage_key=sub.current_stage_key,
                from_status=sub.status,
                to_status=sub.status,
            )

        sub.last_actor = request.user
        sub.last_acted_at = timezone.now()
        sub.save()
        _upsert_index(sub)
        return Response(SubmissionDetailSerializer(sub).data)

    # Maps stage_type → the Submission.Status that applies while IN that stage
    _STAGE_TYPE_STATUS = {
        WorkflowStage.StageType.VERIFICATION: Submission.Status.IN_REVIEW,
        WorkflowStage.StageType.PAYMENT: Submission.Status.IN_REVIEW,
        WorkflowStage.StageType.EXTERNAL: Submission.Status.IN_REVIEW,
        WorkflowStage.StageType.PUBLISH: Submission.Status.PUBLISHING,
        WorkflowStage.StageType.COLLECTION: Submission.Status.COLLECTION,
    }

    # Maps stage_type → the final Submission.Status when approved past that stage
    _STAGE_COMPLETION_STATUS = {
        WorkflowStage.StageType.COLLECTION: Submission.Status.COLLECTED,
        WorkflowStage.StageType.PUBLISH: Submission.Status.APPROVED,
        WorkflowStage.StageType.VERIFICATION: Submission.Status.APPROVED,
    }

    def _do_approve(self, sub, actor, notes):
        from_stage = sub.current_stage_key
        from_status = sub.status

        stages = list(sub.permit_type.stages.order_by("order"))
        current_idx = next(
            (i for i, s in enumerate(stages) if s.key == sub.current_stage_key), -1
        )
        current_stage = stages[current_idx] if current_idx >= 0 else None

        # Skip any following applicant-role stages automatically
        next_idx = current_idx + 1
        while next_idx < len(stages) and stages[next_idx].actor_role == "applicant":
            next_idx += 1

        if next_idx < len(stages):
            next_stage = stages[next_idx]
            sub.current_stage_key = next_stage.key
            sub.current_stage_order = next_stage.order
            sub.stage_entered_at = timezone.now()
            sub.status = self._STAGE_TYPE_STATUS.get(
                next_stage.stage_type, Submission.Status.IN_REVIEW
            )
        else:
            # No more stages — terminal status depends on the stage we just completed
            sub.status = self._STAGE_COMPLETION_STATUS.get(
                current_stage.stage_type if current_stage else None,
                Submission.Status.APPROVED,
            )

        compute_submission_sla(sub)
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.APPROVE,
            actor=actor,
            from_stage_key=from_stage,
            to_stage_key=sub.current_stage_key,
            from_status=from_status,
            to_status=sub.status,
            notes=notes,
        )
        _notify_stage_advance(sub, actor)

    def _do_revise(self, sub, actor, notes, revision_fields):
        from_status = sub.status
        sub.status = Submission.Status.REVISION
        for rf in revision_fields:
            SubmissionRevisionField.objects.create(
                submission=sub,
                field_key=rf.get("field_key", ""),
                is_doc_requirement=rf.get("is_doc_requirement", False),
                note=rf.get("note", ""),
            )
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.REVISE,
            actor=actor,
            from_status=from_status,
            to_status=sub.status,
            notes=notes,
        )
        _notify_revision(sub, actor)

    def _do_reject(self, sub, actor, notes, reason):
        from_status = sub.status
        sub.status = Submission.Status.REJECTED
        sub.rejection_reason = reason
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.REJECT,
            actor=actor,
            from_status=from_status,
            to_status=sub.status,
            notes=notes,
        )
        _notify_rejection(sub, actor)

    @action(detail=True, methods=["post"], url_path="resubmit")
    def resubmit(self, request, pk=None):
        """Applicant re-submits after revision."""
        sub = self.get_object()
        if sub.applicant != request.user:
            return Response({"detail": "Bukan pengaju ini."}, status=403)
        if sub.status != Submission.Status.REVISION:
            return Response({"detail": "Pengajuan tidak dalam status revisi."}, status=400)

        # Update form_data with new values
        new_form_data = request.data.get("form_data", {})
        sub.form_data.update(new_form_data)
        sub.status = Submission.Status.IN_REVIEW

        # Mark revision fields resolved
        sub.revision_fields.filter(is_resolved=False).update(is_resolved=True)

        sub.stage_entered_at = timezone.now()
        compute_submission_sla(sub)
        sub.save()

        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.RESUBMIT,
            actor=request.user,
            is_applicant_action=True,
            to_status=sub.status,
        )
        _upsert_index(sub)
        return Response(SubmissionDetailSerializer(sub).data)

    @action(detail=True, methods=["get"], url_path="audit")
    def audit(self, request, pk=None):
        sub = self.get_object()
        entries = sub.audit_entries.order_by("created_at")
        return Response(AuditEntrySerializer(entries, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="site-visit")
    def site_visit(self, request, pk=None):
        sub = self.get_object()
        if request.method == "GET":
            visits = sub.site_visits.all()
            return Response(SiteVisitSerializer(visits, many=True).data)

        serializer = SiteVisitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = serializer.save(submission=sub, stage_key=sub.current_stage_key)
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.VISIT_SCHEDULED,
            actor=request.user,
            notes=f"Dijadwalkan: {visit.scheduled_date}",
        )
        # Send WA visit ticket (no-op if FEATURE_WHATSAPP_ENABLED is false)
        try:
            from django.utils.dateparse import parse_datetime

            from apps.whatsapp.services import create_visit_ticket
            scheduled_at = parse_datetime(str(visit.scheduled_date))
            if scheduled_at:
                create_visit_ticket(
                    submission=sub,
                    scheduled_by=request.user,
                    scheduled_at=scheduled_at,
                    location_notes=request.data.get("location_notes", ""),
                )
        except Exception:
            pass  # WA ticket is best-effort
        return Response(SiteVisitSerializer(visit).data, status=status.HTTP_201_CREATED)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _upsert_index(sub: Submission) -> None:
    SubmissionIndex.objects.update_or_create(
        submission=sub,
        defaults={
            "applicant_email": sub.applicant.email,
            "applicant_name": sub.applicant.full_name,
            "sektor_key": sub.permit_type.sektor.key,
            "sektor_name": sub.permit_type.sektor.name,
            "izin_key": sub.permit_type.key,
            "izin_name": sub.permit_type.name,
            "reference_number": sub.reference_number,
            "status": sub.status,
            "current_stage_key": sub.current_stage_key,
            "sla_due_at": sub.sla_due_at,
            "is_sla_breached": sub.is_sla_breached,
            "submitted_at": sub.submitted_at,
            "created_at": sub.created_at,
            "updated_at": sub.updated_at,
        },
    )


def _notify_submission(sub: Submission) -> None:
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification
    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.SUBMISSION_SUBMITTED,
        title="Pengajuan Diterima",
        body=f"Pengajuan {sub.reference_number} berhasil dikirim dan sedang diproses.",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
        send_whatsapp=True,
    )


def _notify_stage_advance(sub: Submission, actor) -> None:
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification
    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.STAGE_ADVANCED,
        title="Pengajuan Berlanjut",
        body=f"Pengajuan {sub.reference_number} telah masuk ke tahap berikutnya.",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
        send_whatsapp=True,
    )


def _notify_revision(sub: Submission, actor) -> None:
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification
    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.REVISION_REQUESTED,
        title="Revisi Dibutuhkan",
        body=f"Pengajuan {sub.reference_number} membutuhkan revisi. Cek detailnya di portal.",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
        send_whatsapp=True,
    )


def _notify_rejection(sub: Submission, actor) -> None:
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification
    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.SUBMISSION_REJECTED,
        title="Pengajuan Ditolak",
        body=f"Pengajuan {sub.reference_number} ditolak. Alasan: {sub.rejection_reason}",
        submission_id=sub.id,
        action_url=f"/portal/submissions/{sub.id}",
        send_whatsapp=True,
    )
