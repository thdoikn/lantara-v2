import uuid as uuid_lib

from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import IssuedPermit
from .serializers import IssuedPermitDetailSerializer


def _validation_payload(permit: IssuedPermit) -> dict:
    """Public, self-describing validation result consumed by the frontend."""
    sub = permit.submission
    return {
        "is_valid": True,
        "validation_message": "Dokumen ini sah dan terdaftar resmi di Otorita Ibu Kota Nusantara.",
        "permit_number": sub.reference_number,
        "holder_name": sub.applicant.full_name,
        "permit_type_name": sub.permit_type.name,
        "sektor_name": sub.permit_type.sektor.name,
        "issued_date": permit.published_at.isoformat() if permit.published_at else None,
        "valid_until": None,
        "issued_by": permit.signatory_name or "Otorita Ibu Kota Nusantara",
    }


_INVALID_PAYLOAD = {
    "is_valid": False,
    "validation_message": "Dokumen tidak ditemukan, belum diterbitkan, atau telah dicabut.",
    "permit_number": "",
    "holder_name": "",
    "permit_type_name": "",
    "sektor_name": "",
    "issued_date": None,
    "valid_until": None,
    "issued_by": "",
}


class PublicValidateView(APIView):
    """
    Public permit validation — no login required. Two entry points:
      GET /api/v1/permits/validate/{uuid}/   ← QR code deep links
      GET /api/v1/permits/validate/?code=... ← UUID *or* reference number
                                               (e.g. LANTARA/SOSIAL/.../2026/0001)

    Always returns HTTP 200 with an ``is_valid`` flag so the client can render a
    proper valid / invalid result card; only malformed requests return non-200.
    """

    permission_classes = [AllowAny]

    def get(self, request, uuid=None):
        code = str(uuid) if uuid is not None else (request.query_params.get("code") or "").strip()
        if not code:
            return Response(
                {"detail": "Sertakan UUID atau nomor izin pada parameter 'code'."},
                status=400,
            )

        base = IssuedPermit.objects.select_related(
            "submission__permit_type__sektor",
            "submission__applicant",
        ).filter(generation_status=IssuedPermit.GenerationStatus.PUBLISHED)

        # A UUID matches the QR validation id; anything else is a reference number.
        try:
            lookup = {"validation_uuid": uuid_lib.UUID(code)}
        except (ValueError, AttributeError, TypeError):
            lookup = {"submission__reference_number__iexact": code}

        permit = base.filter(**lookup).first()
        if permit is None:
            return Response(_INVALID_PAYLOAD)
        return Response(_validation_payload(permit))


class GenerateDraftView(APIView):
    """POST /api/v1/permits/{submission_id}/generate-draft/ — staff only."""

    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        from apps.submissions.models import Submission

        try:
            sub = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            return Response({"detail": "Pengajuan tidak ditemukan."}, status=404)

        if not request.user.is_staff and not request.user.has_stage_permission(
            f"{sub.current_stage_key}:{sub.permit_type.key}"
        ):
            return Response({"detail": "Akses ditolak."}, status=403)

        permit, _ = IssuedPermit.objects.get_or_create(submission=sub)
        # Trigger async PDF generation
        from .tasks import generate_permit_pdf

        task = generate_permit_pdf.delay(str(permit.id))
        permit.generation_task_id = task.id
        permit.generation_status = IssuedPermit.GenerationStatus.PENDING
        permit.save(update_fields=["generation_task_id", "generation_status"])

        return Response(
            {"detail": "Draf sedang dibuat.", "task_id": task.id},
            status=202,
        )


class PublishPermitView(APIView):
    """
    POST /api/v1/permits/{submission_id}/publish/
    Staff: mark draft permit as published (officially issued).
    Accepts optional signatory info in body.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        from apps.submissions.models import Submission

        try:
            sub = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            return Response({"detail": "Pengajuan tidak ditemukan."}, status=404)

        if not request.user.is_staff and not request.user.has_stage_permission(
            f"{sub.current_stage_key}:{sub.permit_type.key}"
        ):
            return Response({"detail": "Akses ditolak."}, status=403)

        permit, _ = IssuedPermit.objects.get_or_create(submission=sub)
        if permit.generation_status not in (
            IssuedPermit.GenerationStatus.DRAFT,
            IssuedPermit.GenerationStatus.SIGNED,
        ):
            return Response(
                {"detail": "Izin belum dalam status draf. Generate draf terlebih dahulu."},
                status=400,
            )

        permit.generation_status = IssuedPermit.GenerationStatus.PUBLISHED
        permit.published_at = timezone.now()
        permit.signatory_name = request.data.get("signatory_name", permit.signatory_name)
        permit.signatory_title = request.data.get("signatory_title", permit.signatory_title)
        permit.signatory_nip = request.data.get("signatory_nip", permit.signatory_nip)
        permit.save()

        # Update submission status to collected (fully issued + ready for pickup)
        from apps.submissions.models import Submission as Sub

        sub.status = Sub.Status.COLLECTED
        sub.save(update_fields=["status"])

        return Response(IssuedPermitDetailSerializer(permit).data)
