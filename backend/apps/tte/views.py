"""
TTE API views — Phase 3.

POST /api/v1/tte/<permit_id>/sign/  — trigger TTE signing (staff only)
GET  /api/v1/tte/<permit_id>/status/ — poll TTE status
"""
import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import status as drf_status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TTERequest

logger = logging.getLogger(__name__)


class TTESignView(APIView):
    """Trigger TTE signing for an issued permit."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, permit_id):
        from apps.permits.models import IssuedPermit

        from .adapter import sign_permit

        try:
            permit = IssuedPermit.objects.get(id=permit_id)
        except IssuedPermit.DoesNotExist:
            return Response({"detail": "Izin tidak ditemukan."}, status=404)

        # Idempotent — if already signed, return current status
        existing = TTERequest.objects.filter(permit=permit, status=TTERequest.Status.SIGNED).first()
        if existing:
            return Response(
                {
                    "status": existing.status,
                    "is_mock": existing.is_mock,
                    "signed_at": existing.signed_at,
                    "bsre_transaction_id": existing.bsre_transaction_id,
                },
                status=drf_status.HTTP_200_OK,
            )

        tte_req, _ = TTERequest.objects.get_or_create(permit=permit)
        tte_req.status = TTERequest.Status.PROCESSING
        tte_req.save(update_fields=["status"])

        try:
            signed_pdf, is_mock = sign_permit(permit)
            _store_signed_pdf(permit, signed_pdf)
            tte_req.status = TTERequest.Status.MOCK if is_mock else TTERequest.Status.SIGNED
            tte_req.is_mock = is_mock
            tte_req.signed_at = timezone.now()
            tte_req.save(update_fields=["status", "is_mock", "signed_at"])

            enabled = getattr(settings, "FEATURE_TTE_ENABLED", False)
            return Response(
                {
                    "status": tte_req.status,
                    "is_mock": is_mock,
                    "signed_at": tte_req.signed_at,
                    "tte_enabled": enabled,
                    "message": (
                        "TTE diterapkan via BSrE." if not is_mock
                        else "Mock TTE diterapkan — FEATURE_TTE_ENABLED=false."
                    ),
                }
            )
        except Exception as exc:
            tte_req.status = TTERequest.Status.FAILED
            tte_req.error_detail = str(exc)
            tte_req.save(update_fields=["status", "error_detail"])
            logger.exception("TTE signing failed for permit %s", permit_id)
            return Response(
                {"detail": f"TTE gagal: {exc}"},
                status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TTEStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, permit_id):

        try:
            tte_req = TTERequest.objects.get(permit_id=permit_id)
        except TTERequest.DoesNotExist:
            return Response({"status": "not_started", "is_mock": False})

        return Response(
            {
                "status": tte_req.status,
                "is_mock": tte_req.is_mock,
                "signed_at": tte_req.signed_at,
                "bsre_transaction_id": tte_req.bsre_transaction_id,
                "error_detail": tte_req.error_detail if request.user.is_staff else "",
                "tte_enabled": getattr(settings, "FEATURE_TTE_ENABLED", False),
            }
        )


def _store_signed_pdf(permit, pdf_bytes: bytes) -> None:
    """Upload signed PDF to MinIO, updating permit.signed_pdf_key."""
    try:
        import boto3
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        key = f"permits/{permit.id}/signed.pdf"
        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )
        # Track the key on the TTERequest
        TTERequest.objects.filter(permit=permit).update(signed_pdf_key=key)
    except Exception as exc:
        logger.error("Failed to store signed PDF: %s", exc)
