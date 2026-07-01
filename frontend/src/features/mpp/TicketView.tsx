import type { Ticket } from "./api";

export const STATUS_LABEL: Record<string, string> = {
  reserved: "Menunggu Check-in",
  checked_in: "Sudah Check-in",
  in_pool: "Dalam Antrean",
  called: "Sedang Dipanggil",
  serving: "Sedang Dilayani",
  served: "Selesai",
  no_show: "Tidak Hadir",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
};

export const ACTIVE_STATUSES = ["reserved", "checked_in", "in_pool", "called", "serving"];

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * The visual ticket: royal header with the big number + QR, and a stat grid.
 * Shared by the citizen ticket page and the kiosk confirmation screen.
 */
export function TicketView({ ticket, large = false }: { ticket: Ticket; large?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-royal-100 bg-white shadow-sm">
      <div className="bg-gradient-royal px-6 py-8 text-center text-white">
        <p className="text-sm opacity-80">Nomor Antrean</p>
        <p className={`font-display font-bold tracking-tight ${large ? "text-8xl" : "text-6xl"}`}>
          {ticket.number}
        </p>
        <p className="mt-1 text-sm opacity-90">
          {ticket.instansi_name} — {ticket.layanan_name}
        </p>
        {ticket.is_priority && (
          <p className="mt-2 inline-block rounded-full bg-gold-500 px-3 py-0.5 text-xs font-semibold text-royal-950">
            PRIORITAS
          </p>
        )}
      </div>

      {ticket.qr_data_url && (
        <div className="flex justify-center border-b border-royal-50 py-5">
          <img
            src={ticket.qr_data_url}
            alt="QR check-in"
            className={large ? "h-44 w-44" : "h-32 w-32"}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-royal-50 text-center">
        <Stat label="Status" value={STATUS_LABEL[ticket.status] ?? ticket.status} />
        <Stat
          label="Sisa di depan"
          value={ticket.ahead === null || ticket.ahead === undefined ? "—" : `${ticket.ahead} nomor`}
        />
        <Stat label="Estimasi panggil" value={fmtTime(ticket.estimated_call_at)} />
        <Stat label="Loket" value={ticket.loket_code ?? "—"} />
      </div>

      {ticket.is_demoted && (
        <p className="bg-status-warning/10 px-6 py-2 text-center text-xs text-status-warning">
          Check-in melewati jendela — posisi mengikuti waktu check-in.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-4">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

export function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { detail?: string } } };
  return ax.response?.data?.detail ?? "Terjadi kesalahan.";
}
