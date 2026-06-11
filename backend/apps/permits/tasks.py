"""Celery tasks for async PDF generation."""
from celery import shared_task


@shared_task(bind=True, max_retries=2)
def generate_permit_pdf(self, permit_id: str):
    from .models import IssuedPermit
    try:
        permit = IssuedPermit.objects.select_related(
            "submission__permit_type", "submission__applicant"
        ).get(id=permit_id)
    except IssuedPermit.DoesNotExist:
        return

    try:
        # Phase 1: basic HTML→PDF via WeasyPrint
        # Phase 2: template-driven with merge fields + terbilang + QR embed
        import io
        import qrcode
        from weasyprint import HTML

        sub = permit.submission
        qr_img = qrcode.make(permit.validation_url)

        html_content = _render_permit_html(permit, sub, qr_img)
        pdf_bytes = HTML(string=html_content).write_pdf()

        from django.core.files.base import ContentFile
        permit.draft_pdf_file.save(
            f"draft_{sub.reference_number}.pdf",
            ContentFile(pdf_bytes),
            save=False,
        )
        permit.generation_status = IssuedPermit.GenerationStatus.DRAFT
        permit.save(update_fields=["draft_pdf_file", "generation_status"])
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


def _render_permit_html(permit, sub, qr_img=None):
    import io, base64
    qr_b64 = ""
    if qr_img:
        buf = io.BytesIO()
        qr_img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

    return f"""
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Times New Roman', serif; margin: 40px; }}
    .header {{ text-align: center; margin-bottom: 30px; }}
    .title {{ font-size: 14pt; font-weight: bold; text-transform: uppercase; }}
    .ref {{ margin: 20px 0; }}
    table.data {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
    table.data td {{ padding: 6px 10px; vertical-align: top; }}
    table.data td:first-child {{ width: 40%; font-weight: bold; }}
    .qr {{ text-align: right; margin-top: 20px; }}
    .footer {{ margin-top: 60px; text-align: right; }}
  </style>
</head>
<body>
  <div class="header">
    <div class="title">OTORITA IBU KOTA NUSANTARA</div>
    <div class="title">{sub.permit_type.product_name or sub.permit_type.name}</div>
  </div>
  <div class="ref">Nomor: {sub.reference_number}</div>
  <table class="data">
    <tr><td>Nama Pemohon</td><td>: {sub.applicant.full_name}</td></tr>
    <tr><td>Jenis Perizinan</td><td>: {sub.permit_type.name}</td></tr>
    <tr><td>Sektor</td><td>: {sub.permit_type.sektor.name}</td></tr>
  </table>
  {"<div class='qr'><img src='data:image/png;base64," + qr_b64 + "' width='80'/></div>" if qr_b64 else ""}
  <div class="footer">
    <p>{permit.signatory_title or 'Kepala Otorita IKN'}</p>
    <br/><br/><br/>
    <p><u>{permit.signatory_name or '____________________'}</u></p>
    <p>NIP. {permit.signatory_nip or '-'}</p>
  </div>
</body>
</html>"""
