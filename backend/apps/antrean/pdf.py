"""Queue ticket rendering — QR image + printable PDF.

Mirrors apps/permits/tasks.py (qrcode + WeasyPrint). The QR encodes the ticket's
check-in URL, so a staffed anjungan can scan it to check the visitor in.
"""

import base64
import io


def qr_data_url(ticket) -> str:
    """Base64 PNG data-URL of the ticket QR (for on-screen <img> + PDF embed)."""
    import qrcode

    img = qrcode.make(ticket.checkin_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _fmt_est(ticket) -> str:
    from django.utils import timezone

    if not ticket.estimated_call_at:
        return "-"
    return timezone.localtime(ticket.estimated_call_at).strftime("%d %b %Y, %H:%M")


def render_ticket_html(ticket) -> str:
    lyn = ticket.layanan
    tenant = lyn.instansi
    holder = ticket.holder_name or (ticket.applicant.full_name if ticket.applicant_id else "Tamu")
    channel = "Online (virtual)" if ticket.channel == "online" else "Walk-in"
    return f"""
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <style>
    @page {{ size: 80mm 140mm; margin: 6mm; }}
    body {{ font-family: 'Helvetica', sans-serif; text-align: center; color: #0D1F5C; }}
    .tenant {{ font-size: 11pt; font-weight: bold; }}
    .service {{ font-size: 9pt; color: #4B5E8A; margin-bottom: 8px; }}
    .label {{ font-size: 8pt; color: #94A3B8; letter-spacing: 1px; }}
    .number {{ font-size: 48pt; font-weight: bold; margin: 4px 0; }}
    table {{ width: 100%; font-size: 8pt; margin-top: 8px; }}
    td {{ padding: 2px 0; text-align: left; }}
    td.r {{ text-align: right; color: #4B5E8A; }}
    .qr {{ margin-top: 10px; }}
    .foot {{ font-size: 7pt; color: #94A3B8; margin-top: 8px; }}
  </style>
</head>
<body>
  <div class="tenant">{tenant.name}</div>
  <div class="service">{lyn.name}</div>
  <div class="label">NOMOR ANTREAN</div>
  <div class="number">{ticket.number}</div>
  <table>
    <tr><td>Atas nama</td><td class="r">{holder}</td></tr>
    <tr><td>Kanal</td><td class="r">{channel}</td></tr>
    <tr><td>Estimasi panggil</td><td class="r">{_fmt_est(ticket)}</td></tr>
    <tr><td>Tanggal</td><td class="r">{ticket.service_date:%d %b %Y}</td></tr>
  </table>
  <div class="qr"><img src="{qr_data_url(ticket)}" width="120"/></div>
  <div class="foot">Pindai QR di anjungan MPP untuk check-in.<br/>Antrean MPP — Otorita IKN</div>
</body>
</html>"""


def render_ticket_pdf(ticket) -> bytes:
    from weasyprint import HTML

    return HTML(string=render_ticket_html(ticket)).write_pdf()
