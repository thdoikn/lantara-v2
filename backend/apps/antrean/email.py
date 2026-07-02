"""Email a queue ticket — HTML body + PDF attachment.

Additive: uses EmailMultiAlternatives directly (the codebase's shared
notifications.utils._send_email is plain-text only and left untouched).
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_ticket_email(ticket) -> bool:
    """Send the ticket to its delivery email. Returns False if there's no address
    or no generated PDF yet. Never raises to the caller."""
    to = ticket.delivery_email
    if not to:
        return False

    tenant = ticket.layanan.instansi.name
    is_online = ticket.channel == "online"
    subject = f"Nomor Antrean {ticket.number} — {tenant}"
    reminder_text = (
        "\n\nPENTING: Lakukan check-in saat tiba di MPP (pindai QR pada lampiran di "
        "anjungan). Nomor online yang belum check-in akan dilewati dan hangus."
        if is_online
        else ""
    )
    text = (
        f"Nomor antrean Anda: {ticket.number}\n"
        f"Layanan: {ticket.layanan.name} ({tenant})\n"
        f"Tanggal: {ticket.service_date:%d %b %Y}\n\n"
        "Tunjukkan nomor / QR pada lampiran saat tiba di MPP untuk check-in."
        f"{reminder_text}"
    )
    reminder_html = (
        "<p style='margin-top:12px;padding:10px 12px;background:#FEF3C7;"
        "border:1px solid #FCD34D;border-radius:8px;color:#B45309;font-size:13px'>"
        "<b>Penting:</b> Lakukan <b>check-in</b> saat tiba di MPP (pindai QR di anjungan). "
        "Nomor online yang belum check-in akan dilewati dan hangus.</p>"
        if is_online
        else ""
    )
    html = f"""
      <div style="font-family:sans-serif;color:#0D1F5C">
        <p style="color:#94A3B8;letter-spacing:1px;margin:0">NOMOR ANTREAN</p>
        <p style="font-size:40px;font-weight:bold;margin:4px 0">{ticket.number}</p>
        <p style="margin:0">{ticket.layanan.name} — {tenant}</p>
        <p style="margin:2px 0;color:#4B5E8A">Tanggal: {ticket.service_date:%d %b %Y}</p>
        <p style="margin-top:12px">Tunjukkan QR pada tiket terlampir untuk check-in di anjungan MPP.</p>
        {reminder_html}
      </div>
    """

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=[to],
        )
        msg.attach_alternative(html, "text/html")
        if ticket.pdf_file:
            ticket.pdf_file.open("rb")
            msg.attach(f"tiket-{ticket.number}.pdf", ticket.pdf_file.read(), "application/pdf")
            ticket.pdf_file.close()
        msg.send(fail_silently=True)
        return True
    except Exception:
        return False
