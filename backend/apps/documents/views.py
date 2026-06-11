import hashlib

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.submissions.models import Submission

from .models import UploadedDocument
from .serializers import DocumentUploadSerializer, UploadedDocumentSerializer


class DocumentViewSet(viewsets.ViewSet):
    """
    Upload and list documents for a submission.
    File validation (type, size, checksum) runs inline; async virus-scan
    via Celery is triggered after save.
    """

    permission_classes = [IsAuthenticated]

    def _get_submission(self, submission_id, user):
        try:
            sub = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            return None, Response({"detail": "Pengajuan tidak ditemukan."}, status=404)
        # Applicants can only upload to their own submissions
        if not user.is_staff and sub.applicant != user:
            return None, Response({"detail": "Akses ditolak."}, status=403)
        return sub, None

    def list(self, request, submission_pk=None):
        sub, err = self._get_submission(submission_pk, request.user)
        if err:
            return err
        docs = UploadedDocument.objects.filter(submission=sub, is_active=True)
        return Response(UploadedDocumentSerializer(docs, many=True).data)

    def create(self, request, submission_pk=None):
        sub, err = self._get_submission(submission_pk, request.user)
        if err:
            return err

        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        req_key = data["requirement_key"]
        file_obj = data["file"]

        # Validate against DocumentRequirement
        req = sub.permit_type.doc_requirements.filter(key=req_key).first()
        if not req:
            return Response({"detail": f"Persyaratan '{req_key}' tidak ditemukan."}, status=400)

        # File size check
        if file_obj.size > req.max_bytes:
            mb = req.max_bytes // (1024 * 1024)
            return Response({"detail": f"Ukuran file melebihi {mb} MB."}, status=400)

        # File type check
        ext = file_obj.name.rsplit(".", 1)[-1].lower() if "." in file_obj.name else ""
        if req.allowed_types and ext not in req.allowed_types:
            return Response(
                {"detail": f"Tipe file tidak diizinkan. Gunakan: {', '.join(req.allowed_types)}"},
                status=400,
            )

        # Deactivate previous upload for this requirement
        UploadedDocument.objects.filter(
            submission=sub, requirement_key=req_key, is_active=True
        ).update(is_active=False)

        # Checksum
        sha = hashlib.sha256(file_obj.read()).hexdigest()
        file_obj.seek(0)

        doc = UploadedDocument.objects.create(
            submission=sub,
            requirement_key=req_key,
            requirement_title=req.title,
            uploaded_by=request.user,
            file=file_obj,
            original_filename=file_obj.name,
            file_size=file_obj.size,
            checksum_sha256=sha,
            status=UploadedDocument.Status.PENDING,
        )

        # Async validation (virus scan, MIME check)
        _schedule_validation(doc.id)

        return Response(UploadedDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


def _schedule_validation(doc_id):
    try:
        from .tasks import validate_document
        validate_document.delay(str(doc_id))
    except Exception:
        pass
