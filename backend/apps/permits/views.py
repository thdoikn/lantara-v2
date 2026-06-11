from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import IssuedPermit
from .serializers import IssuedPermitDetailSerializer, IssuedPermitPublicSerializer


class PublicValidateView(APIView):
    """
    GET /api/v1/permits/validate/{uuid}/
    Public permit validation by QR UUID — no login required.
    """

    permission_classes = [AllowAny]

    def get(self, request, uuid):
        try:
            permit = IssuedPermit.objects.select_related(
                "submission__permit_type__sektor",
                "submission__applicant",
            ).get(
                validation_uuid=uuid,
                generation_status=IssuedPermit.GenerationStatus.PUBLISHED,
            )
        except IssuedPermit.DoesNotExist:
            return Response({"detail": "Izin tidak ditemukan atau belum diterbitkan."}, status=404)
        return Response(IssuedPermitPublicSerializer(permit).data)


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
