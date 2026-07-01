import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTicket,
  checkInTicket,
  cancelTicket,
  resendTicketEmail,
  ticketPdfUrl,
} from "./api";
import { ACTIVE_STATUSES, TicketView, errMsg } from "./TicketView";
import { useTicketSocket } from "./useQueueSocket";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";

/** Standalone queue ticket — not tied to any izin submission. */
export default function MyTicketPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["antrean", "ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  useTicketSocket(id ?? null, () => {
    qc.invalidateQueries({ queryKey: ["antrean", "ticket", id] });
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["antrean", "ticket", id] });

  const checkin = useMutation({
    mutationFn: () => checkInTicket(id!),
    onSuccess: () => {
      toast.success("Check-in berhasil. Anda masuk kolam panggil.");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const cancel = useMutation({
    mutationFn: () => cancelTicket(id!),
    onSuccess: () => {
      toast.info("Nomor antrean dibatalkan.");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const email = useMutation({
    mutationFn: () => resendTicketEmail(id!),
    onSuccess: (d) => toast.success(d.detail),
    onError: (e) => toast.error(errMsg(e)),
  });

  async function onDownload() {
    try {
      await downloadFile(ticketPdfUrl(id!), `tiket-${ticket?.number ?? id}.pdf`);
    } catch {
      toast.error("Gagal mengunduh tiket.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to="/antrean" className="text-sm text-royal-600 hover:underline">
        ← Kembali ke katalog antrean
      </Link>
      <h1 className="mt-3 text-2xl font-display font-bold text-ink">Tiket Antrean MPP</h1>

      {isLoading || !ticket ? (
        <p className="mt-6 text-ink-muted">Memuat…</p>
      ) : (
        <div className="mt-6 space-y-4">
          <TicketView ticket={ticket} />

          <div className="flex flex-wrap gap-3">
            {ticket.status === "reserved" && (
              <button
                onClick={() => checkin.mutate()}
                disabled={checkin.isPending}
                className="flex-1 rounded-xl bg-royal-600 px-4 py-2.5 font-semibold text-white hover:bg-royal-700 disabled:opacity-60"
              >
                {checkin.isPending ? "Memproses…" : "Check-in di Lokasi"}
              </button>
            )}
            <button
              onClick={onDownload}
              className="rounded-xl border border-royal-200 px-4 py-2.5 font-semibold text-ink-muted hover:bg-royal-50"
            >
              Unduh PDF
            </button>
            <button
              onClick={() => email.mutate()}
              disabled={email.isPending}
              className="rounded-xl border border-royal-200 px-4 py-2.5 font-semibold text-ink-muted hover:bg-royal-50 disabled:opacity-60"
            >
              Kirim ke Email
            </button>
            {ACTIVE_STATUSES.includes(ticket.status) &&
              (ticket.status === "reserved" || ticket.status === "in_pool") && (
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="rounded-xl border border-status-danger/30 px-4 py-2.5 font-semibold text-status-danger hover:bg-status-danger/5 disabled:opacity-60"
                >
                  Batalkan
                </button>
              )}
          </div>

          <p className="text-center text-xs text-ink-faint">
            Tunjukkan / pindai QR di anjungan MPP saat tiba untuk check-in.
          </p>
        </div>
      )}
    </div>
  );
}
