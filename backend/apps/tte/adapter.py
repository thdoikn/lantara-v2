"""
TTE adapter — BSrE / BSSN interface (dependency-gated).

When FEATURE_TTE_ENABLED=false (default), applies a mock "SIMULASI TTE" watermark
stamp to the permit PDF. This satisfies the Phase 3 build requirement while keeping
real issuance gated behind the flag and BSrE credentials.

Real adapter stub:
  POST {BSRE_API_URL}/sign
    body: { document_b64: <base64 PDF>, nik_signatory: <NIK>, passphrase: <enc> }
  Response: { transaction_id, signed_document_b64 }
"""
import base64
import logging
from io import BytesIO

from django.conf import settings

logger = logging.getLogger(__name__)


def sign_permit(permit) -> tuple[bytes, bool]:
    """
    Returns (signed_pdf_bytes, is_mock).
    Reads the permit's existing draft_pdf from MinIO, applies TTE or mock stamp.
    """
    pdf_bytes = _fetch_permit_pdf(permit)
    if not pdf_bytes:
        raise ValueError("Permit PDF tidak ditemukan.")

    if getattr(settings, "FEATURE_TTE_ENABLED", False):
        return _sign_via_bsre(pdf_bytes, permit)
    else:
        return _apply_mock_stamp(pdf_bytes), True


def _fetch_permit_pdf(permit) -> bytes | None:
    try:
        import boto3
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        key = permit.pdf_key or f"permits/{permit.id}/draft.pdf"
        obj = s3.get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
        return obj["Body"].read()
    except Exception as exc:
        logger.error("Failed to fetch permit PDF: %s", exc)
        return None


def _apply_mock_stamp(pdf_bytes: bytes) -> bytes:
    """
    Stamp the PDF with 'SIMULASI TTE — BUKAN DOKUMEN SAH' diagonal watermark.
    Uses PyPDF2 if available; falls back to returning original bytes unchanged.
    """
    try:
        import pypdf
        from reportlab.lib.colors import Color
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as rl_canvas

        # Create watermark page
        buf = BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=A4)
        w, h = A4
        c.saveState()
        c.setFont("Helvetica-Bold", 36)
        c.setFillColor(Color(0.9, 0.2, 0.1, alpha=0.25))
        c.translate(w / 2, h / 2)
        c.rotate(45)
        c.drawCentredString(0, 0, "SIMULASI TTE")
        c.drawCentredString(0, -44, "BUKAN DOKUMEN SAH")
        c.restoreState()
        c.save()
        buf.seek(0)

        watermark_reader = pypdf.PdfReader(buf)
        watermark_page = watermark_reader.pages[0]

        reader = pypdf.PdfReader(BytesIO(pdf_bytes))
        writer = pypdf.PdfWriter()
        for page in reader.pages:
            page.merge_page(watermark_page)
            writer.add_page(page)

        out = BytesIO()
        writer.write(out)
        return out.getvalue()

    except ImportError:
        logger.warning("pypdf/reportlab not available — returning PDF without mock stamp")
        return pdf_bytes
    except Exception as exc:
        logger.error("Mock stamp failed: %s", exc)
        return pdf_bytes


def _sign_via_bsre(pdf_bytes: bytes, permit) -> tuple[bytes, bool]:
    """Real BSrE API call — only reached when FEATURE_TTE_ENABLED=true."""
    api_url = getattr(settings, "BSRE_API_URL", "")
    api_token = getattr(settings, "BSRE_API_TOKEN", "")

    if not api_url or not api_token:
        logger.error("BSrE not configured — BSRE_API_URL or BSRE_API_TOKEN missing")
        raise RuntimeError("BSrE tidak dikonfigurasi.")

    import requests

    payload = {
        "document_b64": base64.b64encode(pdf_bytes).decode(),
        "nik_signatory": getattr(settings, "TTE_SIGNATORY_NIK", ""),
        "document_id": str(permit.id),
    }
    resp = requests.post(
        f"{api_url}/sign",
        headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    signed_bytes = base64.b64decode(data["signed_document_b64"])
    return signed_bytes, False
