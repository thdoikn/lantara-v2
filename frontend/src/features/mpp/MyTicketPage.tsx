import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Download,
  Mail,
  XCircle,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import {
  getTicket,
  checkInTicket,
  cancelTicket,
  resendTicketEmail,
  ticketPdfUrl,
  type Ticket,
} from "./api";
import { TicketView } from "./TicketView";
import { TERMINAL_STATUSES, STATUS_META, TONE_CLASSES, errMsg } from "./queueStatus";
import { useTicketSocket } from "./useQueueSocket";
import { useCountdown } from "./useCountdown";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";

/** A citizen's standalone queue ticket (not tied to any izin). */
export default function MyTicketPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["antrean", "ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
    refetchInterval: 20_000,
  });

  useTicketSocket(id ?? null, () =>
    qc.invalidateQueries({ queryKey: ["antrean", "ticket", id] }),
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["antrean", "ticket", id] });

  const checkin = useMutation({
    mutationFn: () => checkInTicket(id!),
    onSuccess: () => {
      toast.success("Check-in berhasil — Anda masuk antrean.");
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
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Link
          to="/antrean"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Katalog Antrean
        </Link>

        {isLoading || !ticket ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-ink-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
            Memuat tiket…
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <GuidanceBanner ticket={ticket} />
            <TicketView ticket={ticket} />
            <ActionBar
              ticket={ticket}
              onCheckIn={() => checkin.mutate()}
              checkinBusy={checkin.isPending}
              onCancel={() => cancel.mutate()}
              cancelBusy={cancel.isPending}
              onDownload={onDownload}
              onEmail={() => email.mutate()}
              emailBusy={email.isPending}
              onNew={() => navigate("/antrean")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** The single most important line: what should the citizen do right now. */
function GuidanceBanner({ ticket }: { ticket: Ticket }) {
  const meta = STATUS_META[ticket.status];
  const tone = TONE_CLASSES[meta.tone];
  const countdown = useCountdown(
    ticket.status === "reserved" ? ticket.estimated_call_at : null,
  );
  const Icon = meta.icon;

  let headline = meta.hint;
  if (ticket.status === "reserved") {
    headline =
      countdown && countdown.minutes <= 20
        ? "Giliran Anda mendekat — sebaiknya berangkat & check-in sekarang."
        : "Sudah tiba di MPP? Lakukan check-in agar nomor Anda masuk antrean.";
  } else if (ticket.status === "called") {
    headline = `Giliran Anda! Segera menuju ${ticket.loket_code ?? "loket"}.`;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 ${tone.badge} ${
        meta.urgent ? "ring-2 " + tone.ring : ""
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.urgent ? "animate-pulse motion-reduce:animate-none" : ""}`} />
      <p className="text-sm font-medium leading-snug">{headline}</p>
    </div>
  );
}

function ActionBar({
  ticket,
  onCheckIn,
  checkinBusy,
  onCancel,
  cancelBusy,
  onDownload,
  onEmail,
  emailBusy,
  onNew,
}: {
  ticket: Ticket;
  onCheckIn: () => void;
  checkinBusy: boolean;
  onCancel: () => void;
  cancelBusy: boolean;
  onDownload: () => void;
  onEmail: () => void;
  emailBusy: boolean;
  onNew: () => void;
}) {
  const isTerminal = TERMINAL_STATUSES.includes(ticket.status);
  const canCancel = ticket.status === "reserved" || ticket.status === "in_pool";

  if (isTerminal) {
    return (
      <div className="rounded-2xl border border-royal-100 bg-white p-5 text-center shadow-sm">
        {ticket.status === "served" ? (
          <CheckCircle2 className="mx-auto h-8 w-8 text-status-success" />
        ) : (
          <XCircle className="mx-auto h-8 w-8 text-ink-faint" />
        )}
        <p className="mt-2 text-sm text-ink-muted">{STATUS_META[ticket.status].hint}</p>
        <button
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-royal-600 px-5 py-2.5 font-semibold text-white hover:bg-royal-700"
        >
          <Plus className="h-4 w-4" /> Ambil Nomor Baru
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ticket.status === "reserved" && (
        <button
          onClick={onCheckIn}
          disabled={checkinBusy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-royal-600 px-4 py-3.5 text-base font-semibold text-white shadow-glow-royal transition hover:bg-royal-700 disabled:opacity-60"
        >
          <MapPin className="h-5 w-5" />
          {checkinBusy ? "Memproses…" : "Check-in di Lokasi"}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SecondaryButton onClick={onDownload} icon={Download} label="Unduh PDF" />
        <SecondaryButton onClick={onEmail} icon={Mail} label="Kirim Email" busy={emailBusy} />
      </div>

      {canCancel && (
        <button
          onClick={onCancel}
          disabled={cancelBusy}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-status-danger hover:bg-status-danger/5 disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" /> Batalkan nomor
        </button>
      )}
    </div>
  );
}

function SecondaryButton({
  onClick,
  icon: Icon,
  label,
  busy,
}: {
  onClick: () => void;
  icon: typeof Download;
  label: string;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-center gap-2 rounded-xl border border-royal-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-royal-50 disabled:opacity-60"
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
