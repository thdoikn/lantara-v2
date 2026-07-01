import { useState } from "react";
import { Star, QrCode, X } from "lucide-react";
import type { Ticket } from "./api";
import { STATUS_META, TONE_CLASSES, fmtClock } from "./queueStatus";
import { StatusBadge, QueueStepper, Stat } from "./QueueUI";
import { useCountdown } from "./useCountdown";

/**
 * The visual queue ticket — a "ticket stub": dark khatulistiwa header with the
 * big number, a perforated divider, the QR, a live stat grid, and the journey
 * stepper. Shared by the citizen ticket page and the kiosk confirmation screen.
 */
export function TicketView({
  ticket,
  large = false,
  showStepper = true,
}: {
  ticket: Ticket;
  large?: boolean;
  showStepper?: boolean;
}) {
  const [zoom, setZoom] = useState(false);
  const meta = STATUS_META[ticket.status];
  const tone = TONE_CLASSES[meta.tone];
  const countdown = useCountdown(
    ["reserved", "checked_in", "in_pool"].includes(ticket.status)
      ? ticket.estimated_call_at
      : null,
  );

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-pertiwi-muted">
      {/* Header — big number over the dark brand gradient with a soft glow */}
      <div className="relative overflow-hidden bg-gradient-hero px-6 pb-8 pt-7 text-center text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-terakota-500/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-khatulistiwa-200/70">
            {ticket.instansi_name}
          </p>
          <p
            className={`font-display font-bold leading-none tracking-tight ${
              large ? "text-[5.5rem]" : "text-7xl"
            }`}
          >
            {ticket.number}
          </p>
          <p className="mt-1 text-sm text-khatulistiwa-200/80">{ticket.layanan_name}</p>
          {ticket.is_priority && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-terakota-500 px-3 py-1 text-xs font-bold text-khatulistiwa-900">
              <Star className="h-3.5 w-3.5 fill-khatulistiwa-900" /> PRIORITAS
            </span>
          )}
        </div>
      </div>

      {/* Perforation */}
      <div className="relative h-0">
        <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-pertiwi-warm" />
        <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-pertiwi-warm" />
        <div className="mx-6 border-t-2 border-dashed border-pertiwi-muted" />
      </div>

      {/* Status + guidance */}
      <div className="flex flex-col items-center gap-2 px-6 pb-4 pt-6 text-center">
        <StatusBadge status={ticket.status} />
        <p className="text-sm text-khatulistiwa-600">{meta.hint}</p>
        {countdown && (
          <p className="text-sm">
            <span className="text-khatulistiwa-400">Estimasi dipanggil dalam </span>
            <span className={`font-bold ${tone.text}`}>{countdown.label}</span>
          </p>
        )}
      </div>

      {/* QR */}
      {ticket.qr_data_url && (
        <button
          onClick={() => setZoom(true)}
          className="mx-auto mb-4 flex flex-col items-center gap-1.5 rounded-2xl border border-pertiwi-muted p-3 transition hover:bg-pertiwi-warm"
        >
          <img
            src={ticket.qr_data_url}
            alt="QR check-in"
            className={large ? "h-40 w-40" : "h-28 w-28"}
          />
          <span className="flex items-center gap-1 text-xs text-khatulistiwa-400">
            <QrCode className="h-3.5 w-3.5" /> Ketuk untuk perbesar
          </span>
        </button>
      )}

      {showStepper && (
        <div className="px-5 pb-5 pt-1">
          <QueueStepper ticket={ticket} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px border-t border-pertiwi-muted bg-pertiwi-muted sm:grid-cols-4">
        <Stat
          label="Sisa di depan"
          value={
            ticket.ahead === null || ticket.ahead === undefined ? "—" : `${ticket.ahead} nomor`
          }
          accent
        />
        <Stat label="Estimasi panggil" value={fmtClock(ticket.estimated_call_at)} />
        <Stat label="Loket" value={ticket.loket_code ?? "—"} />
        <Stat label="Kanal" value={ticket.channel === "online" ? "Online" : "Walk-in"} />
      </div>

      {ticket.is_demoted && (
        <p className="bg-terakota-500/10 px-6 py-2 text-center text-xs text-amber-700">
          Check-in melewati jendela — posisi mengikuti waktu check-in.
        </p>
      )}

      {/* QR zoom overlay */}
      {zoom && ticket.qr_data_url && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-khatulistiwa-950/90 p-6"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={ticket.qr_data_url}
            alt="QR check-in"
            className="h-72 w-72 rounded-2xl bg-white p-4"
          />
          <p className="text-2xl font-display font-bold text-white">{ticket.number}</p>
          <p className="text-khatulistiwa-200">
            Tunjukkan / pindai di anjungan MPP untuk check-in
          </p>
          <button
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setZoom(false)}
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>
      )}
    </div>
  );
}
