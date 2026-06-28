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

from .field_validation import validate_form_data
from .models import AuditEntry, SiteVisit, Submission, SubmissionIndex, SubmissionRevisionField
from .serializers import (
    AuditEntrySerializer,
    SiteVisitSerializer,
    SubmissionActionSerializer,
    SubmissionCreateSerializer,
    SubmissionDetailSerializer,
    SubmissionListSerializer,
)
from .sla import add_working_days, compute_submission_sla


class SubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ["permit_type__sektor__key", "permit_type__key"]
    search_fields = ["reference_number", "applicant__full_name", "applicant__email"]
    ordering_fields = ["created_at", "submitted_at", "sla_due_at", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related(
            "permit_type__sektor", "applicant", "assigned_to"
        ).prefetch_related("audit_entries", "revision_fields", "site_visits", "uploaded_documents")

        if user.has_any_role("superadmin") or user.is_sektor_admin:
            # Superadmin (and sektor admin) see all submissions
            pass
        elif user.has_any_role("verifier"):
            # Verifiers — incl. admins who also hold the verifier role — only see
            # submissions for their assigned permit types.
            from apps.accounts.models import VerifierPermitAssignment

            assigned_keys = VerifierPermitAssignment.objects.filter(
                user=user, is_active=True
            ).values_list("permit_type__key", flat=True)
            qs = qs.filter(permit_type__key__in=assigned_keys)
        else:
            # Everyone else (incl. admins without a verifier role) sees only
            # their own submissions — their applicant view.
            qs = qs.filter(applicant=user)

        # Support comma-separated status filter: ?status=in_review,submitted
        status_param = self.request.query_params.get("status", "")
        if status_param:
            statuses = [s.strip() for s in status_param.split(",") if s.strip()]
            if statuses:
                qs = qs.filter(status__in=statuses)

        # Workload filter: ?assigned=me | unassigned | others
        assigned_param = self.request.query_params.get("assigned")
        if assigned_param == "me":
            qs = qs.filter(assigned_to=user)
        elif assigned_param == "unassigned":
            qs = qs.filter(assigned_to__isnull=True)
        elif assigned_param == "others":
            qs = qs.filter(assigned_to__isnull=False).exclude(assigned_to=user)

        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("list",):
            return SubmissionListSerializer
        if self.action == "create":
            return SubmissionCreateSerializer
        return SubmissionDetailSerializer

    def create(self, request, *args, **kwargs):
        """Create a DRAFT submission.

        The SLA clock does NOT start here and the submission does not enter the
        verifier queue — that happens at `finalize`, after the applicant has had
        a chance to upload documents. The schema is snapshotted now so the form
        shape the applicant is filling stays frozen even if an admin edits the
        live izin before finalization.
        """
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
            status=Submission.Status.DRAFT,
        )

        return Response(SubmissionDetailSerializer(sub).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Allow an applicant to revise a DRAFT's form_data before finalizing."""
        sub = self.get_object()
        if sub.applicant != request.user:
            return Response({"detail": "Bukan pengaju ini."}, status=403)
        if sub.status != Submission.Status.DRAFT:
            return Response(
                {"detail": "Hanya draf yang dapat diubah."}, status=status.HTTP_400_BAD_REQUEST
            )
        new_form_data = request.data.get("form_data")
        if isinstance(new_form_data, dict):
            sub.form_data = new_form_data
            sub.save(update_fields=["form_data", "updated_at"])
        return Response(SubmissionDetailSerializer(sub).data)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        """Applicant finalizes a DRAFT: submit it for verification.

        This is the real submission moment — it stamps `submitted_at`, starts the
        SLA clock, routes to the first verifier stage, and notifies. Required
        documents must be uploaded first.
        """
        sub = self.get_object()
        if sub.applicant != request.user:
            return Response({"detail": "Bukan pengaju ini."}, status=403)
        if sub.status != Submission.Status.DRAFT:
            return Response(
                {"detail": "Pengajuan ini sudah dikirim."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow a final form_data update to ride along with finalization.
        new_form_data = request.data.get("form_data")
        if isinstance(new_form_data, dict):
            sub.form_data = new_form_data

        # Gate on form data: required + type-aware format, against the frozen
        # snapshot (can't be bypassed by calling the API directly).
        snapshot_fields = (sub.schema_snapshot or {}).get("form_fields", [])
        field_errors = {}
        for f in snapshot_fields:
            if f.get("required") and sub.form_data.get(f["key"]) in (None, "", []):
                field_errors[f["key"]] = f"{f.get('label')} wajib diisi."
        for key, msg in validate_form_data(snapshot_fields, sub.form_data).items():
            field_errors.setdefault(key, msg)
        if field_errors:
            return Response(
                {"detail": "Periksa kembali isian formulir.", "errors": field_errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Gate on required documents from the frozen snapshot.
        missing = self._missing_required_docs(sub)
        if missing:
            return Response(
                {
                    "detail": "Lengkapi dokumen wajib sebelum mengirim.",
                    "missing_documents": missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        sub.submitted_at = now
        sub.stage_entered_at = now
        sub.status = Submission.Status.SUBMITTED

        # Move to first verifier stage (skip applicant-role stages). Read from
        # the frozen snapshot so routing matches what the applicant filled.
        stages = sub.get_workflow_stages()
        first_stage = next(
            (s for s in stages if s.get("actor_role") != "applicant"),
            stages[0] if stages else None,
        )
        if first_stage:
            sub.current_stage_key = first_stage["key"]
            sub.current_stage_order = first_stage["order"]
            sub.status = Submission.Status.IN_REVIEW

        compute_submission_sla(sub)
        sub.save()

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
        _notify_verifiers_new(sub)

        return Response(SubmissionDetailSerializer(sub).data)

    @staticmethod
    def _missing_required_docs(sub) -> list:
        """Keys of required doc requirements (per snapshot) lacking an active upload."""
        snapshot = sub.schema_snapshot or {}
        required = [d for d in snapshot.get("doc_requirements", []) if d.get("required")]
        if not required:
            return []
        uploaded_keys = set(
            sub.uploaded_documents.filter(is_active=True).values_list("requirement_key", flat=True)
        )
        return [d["key"] for d in required if d.get("key") not in uploaded_keys]

    @action(detail=True, methods=["post"])
    def act(self, request, pk=None):
        """Verifier action: approve / revise / reject."""
        sub = self.get_object()
        serializer = SubmissionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Check act permission: superadmin (and sektor admin) can always act;
        # everyone else — including admins — must hold the verifier role with an
        # active VerifierPermitAssignment for this permit type.
        if not self._verifier_can_act(request.user, sub):
            return Response({"detail": "Tidak memiliki penugasan untuk perizinan ini."}, status=403)

        act = data["action"]
        notes = data.get("notes", "")

        if act == "approve":
            err = self._do_approve(sub, request.user, notes)
            if err is not None:
                return err
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
        # Acting moves the work on, so release the claim — except scheduling a
        # site visit, where the same verifier stays on the case.
        if act != "schedule_site_visit":
            sub.assigned_to = None
            sub.assigned_at = None
        sub.save()
        _upsert_index(sub)
        return Response(SubmissionDetailSerializer(sub).data)

    @staticmethod
    def _verifier_can_act(user, sub) -> bool:
        if user.has_any_role("superadmin") or user.is_sektor_admin:
            return True
        from apps.accounts.models import VerifierPermitAssignment

        return VerifierPermitAssignment.objects.filter(
            user=user, permit_type=sub.permit_type, is_active=True
        ).exists()

    @action(detail=True, methods=["post"])
    def claim(self, request, pk=None):
        """Claim this submission so teammates know it's being handled."""
        sub = self.get_object()
        if not self._verifier_can_act(request.user, sub):
            return Response({"detail": "Tidak memiliki penugasan untuk perizinan ini."}, status=403)
        if sub.assigned_to_id and sub.assigned_to_id != request.user.id:
            return Response(
                {"detail": f"Sudah ditangani oleh {sub.assigned_to.full_name}."}, status=409
            )
        sub.assigned_to = request.user
        sub.assigned_at = timezone.now()
        sub.save(update_fields=["assigned_to", "assigned_at", "updated_at"])
        return Response(SubmissionDetailSerializer(sub).data)

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        """Release a claim (claim owner, or an admin)."""
        sub = self.get_object()
        is_admin = request.user.has_any_role("superadmin") or request.user.is_sektor_admin
        if sub.assigned_to_id and sub.assigned_to_id != request.user.id and not is_admin:
            return Response({"detail": "Hanya pemilik klaim yang dapat melepas."}, status=403)
        sub.assigned_to = None
        sub.assigned_at = None
        sub.save(update_fields=["assigned_to", "assigned_at", "updated_at"])
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

        # Advance along the FROZEN workflow snapshot, never the live config —
        # an admin editing stages must not misroute this in-flight submission.
        stages = sub.get_workflow_stages()
        current_idx = next(
            (i for i, s in enumerate(stages) if s.get("key") == sub.current_stage_key), -1
        )
        current_stage = stages[current_idx] if current_idx >= 0 else None

        # Skip any following applicant-role stages automatically
        next_idx = current_idx + 1
        while next_idx < len(stages) and stages[next_idx].get("actor_role") == "applicant":
            next_idx += 1

        if current_stage is None:
            # Current stage isn't in this submission's frozen workflow — a data
            # integrity problem. Refuse to guess (never silently auto-approve).
            return Response(
                {"detail": "Tahap saat ini tidak ditemukan pada alur pengajuan ini."},
                status=status.HTTP_409_CONFLICT,
            )

        if next_idx < len(stages):
            next_stage = stages[next_idx]
            sub.current_stage_key = next_stage["key"]
            sub.current_stage_order = next_stage["order"]
            sub.stage_entered_at = timezone.now()
            sub.status = self._STAGE_TYPE_STATUS.get(
                next_stage["stage_type"], Submission.Status.IN_REVIEW
            )
        else:
            # No more stages — terminal status depends on the stage we just completed
            sub.status = self._STAGE_COMPLETION_STATUS.get(
                current_stage["stage_type"],
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
        # Advanced into another active stage → alert that stage's verifiers.
        if sub.status not in (
            Submission.Status.APPROVED,
            Submission.Status.COLLECTED,
            Submission.Status.REJECTED,
        ):
            _notify_verifiers_new(sub)

    # Working-days the applicant is given to return a requested revision.
    REVISION_GRACE_DAYS = 5

    def _do_revise(self, sub, actor, notes, revision_fields):
        from_status = sub.status
        sub.status = Submission.Status.REVISION
        for rf in revision_fields:
            field_key = rf.get("field_key", "")
            is_doc = rf.get("is_doc_requirement", False)
            SubmissionRevisionField.objects.create(
                submission=sub,
                field_key=field_key,
                is_doc_requirement=is_doc,
                note=rf.get("note", ""),
                # Capture the value being sent back so the applicant sees "before".
                original_value=None if is_doc else sub.form_data.get(field_key),
            )
        # Give the applicant a working-days deadline to respond.
        sub.revision_due_at = add_working_days(timezone.now(), self.REVISION_GRACE_DAYS)
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

        # Validate only the changed fields against the frozen snapshot.
        if isinstance(new_form_data, dict) and new_form_data:
            snapshot_fields = (sub.schema_snapshot or {}).get("form_fields", [])
            errors = validate_form_data(
                snapshot_fields, {**sub.form_data, **new_form_data}, only_keys=set(new_form_data)
            )
            if errors:
                return Response(
                    {"detail": "Periksa kembali isian formulir.", "errors": errors},
                    status=400,
                )

        sub.form_data.update(new_form_data)
        sub.status = Submission.Status.IN_REVIEW

        # Mark revision fields resolved (kept, with original_value, for the diff)
        sub.revision_fields.filter(is_resolved=False).update(is_resolved=True)
        sub.revision_due_at = None

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
        when = f"{visit.scheduled_date}{f' {visit.scheduled_time}' if visit.scheduled_time else ''}"
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.VISIT_SCHEDULED,
            actor=request.user,
            notes=f"Kunjungan dijadwalkan: {when}"
            + (f" di {visit.location}" if visit.location else ""),
        )
        # Tell the applicant a visit is scheduled.
        _notify_visit_scheduled(sub, visit)
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
                    location_notes=visit.location or request.data.get("location_notes", ""),
                )
        except Exception:
            pass  # WA ticket is best-effort
        return Response(SiteVisitSerializer(visit).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="site-visit/(?P<visit_id>[^/.]+)/complete")
    def complete_site_visit(self, request, pk=None, visit_id=None):
        """Mark a scheduled site visit complete and record findings."""
        sub = self.get_object()
        try:
            visit = sub.site_visits.get(id=visit_id)
        except SiteVisit.DoesNotExist:
            return Response({"detail": "Kunjungan tidak ditemukan."}, status=404)
        visit.findings = request.data.get("findings", visit.findings)
        visit.is_completed = True
        visit.completed_at = timezone.now()
        visit.save(update_fields=["findings", "is_completed", "completed_at", "updated_at"])
        AuditEntry.objects.create(
            submission=sub,
            action=AuditEntry.ActionType.VISIT_COMPLETED,
            actor=request.user,
            notes=visit.findings,
        )
        return Response(SiteVisitSerializer(visit).data)

    @action(detail=True, methods=["get"], url_path="applicant-history")
    def applicant_history(self, request, pk=None):
        """Other submissions by the same applicant (within the verifier's access),
        for repeat-applicant context. Excludes the current submission."""
        sub = self.get_object()
        others = (
            self.get_queryset()
            .filter(applicant=sub.applicant)
            .exclude(id=sub.id)
            .order_by("-created_at")[:25]
        )
        return Response(SubmissionListSerializer(others, many=True).data)

    @action(detail=False, methods=["get"], url_path="verifier-stats")
    def verifier_stats(self, request):
        """Queue health + personal throughput for the verifier home screen."""
        from django.utils import timezone as tz

        base = self.get_queryset()
        active = base.filter(
            status__in=["submitted", "in_review", "revision", "publishing", "collection"]
        )
        today = tz.localtime(tz.now()).date()
        processed_today = Submission.objects.filter(
            last_actor=request.user, last_acted_at__date=today
        ).count()
        return Response(
            {
                "queued": active.count(),
                "at_risk": active.filter(is_sla_at_risk=True, is_sla_breached=False).count(),
                "breached": active.filter(is_sla_breached=True).count(),
                "in_revision": active.filter(status="revision").count(),
                "assigned_to_me": active.filter(assigned_to=request.user).count(),
                "unassigned": active.filter(assigned_to__isnull=True).count(),
                "processed_today": processed_today,
            }
        )


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


def _notify_verifiers_new(sub: Submission) -> None:
    """In-app alert to every verifier assigned to this permit type that a new
    submission is waiting in their queue (no email — avoids inbox spam)."""
    from apps.accounts.models import VerifierPermitAssignment
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    assignments = VerifierPermitAssignment.objects.filter(
        permit_type=sub.permit_type, is_active=True
    ).select_related("user")
    for a in assignments:
        if a.user_id == sub.applicant_id:
            continue
        send_notification(
            recipient=a.user,
            notif_type=Notification.NotifType.GENERAL,
            title="Permohonan baru di antrean",
            body=f"{sub.reference_number} menunggu verifikasi.",
            submission_id=sub.id,
            action_url=f"/verifier/submissions/{sub.id}",
            send_email=False,
        )


def _notify_visit_scheduled(sub: Submission, visit) -> None:
    from apps.notifications.models import Notification
    from apps.notifications.utils import send_notification

    send_notification(
        recipient=sub.applicant,
        notif_type=Notification.NotifType.VISIT_SCHEDULED,
        title="Kunjungan Lapangan Dijadwalkan",
        body=f"Kunjungan untuk {sub.reference_number} dijadwalkan {visit.scheduled_date}.",
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
