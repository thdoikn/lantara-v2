import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  myTickets,
  takeTicket,
  checkInTicket,
  cancelTicket,
  type Ticket,
} from "./api";
import { useTicketSocket } from "./useQueueSocket";
import { toast } from "@/lib/toast";

const STATUS_LABEL: Record<string, string> = {
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

const ACTIVE = ["reserved", "checked_in", "in_pool", "called", "serving"];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function CitizenTicketPage() {
  const { id: submissionId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["antrean", "my-tickets"],
    queryFn: myTickets,
    refetchInterval: 30_000,
  });

  const ticket = useMemo<Ticket | undefined>(
    () =>
      (tickets ?? []).find(
        (t) => t.submission === submissionId && ACTIVE.includes(t.status),
      ) ?? (tickets ?? []).find((t) => t.submission === submissionId),
    [tickets, submissionId],
  );

  useTicketSocket(ticket?.id ?? null, () => {
    qc.invalidateQueries({ queryKey: ["antrean", "my-tickets"] });
  });

  const take = useMutation({
    mutationFn: () => takeTicket({ submission: submissionId, channel: "online" }),
    onSuccess: () => {
      toast.success("Nomor antrean berhasil diambil.");
      qc.invalidateQueries({ queryKey: ["antrean", "my-tickets"] });
    },
    onError: (e: unknown) => toast.error(errMsg(e)),
  });

  const checkin = useMutation({
    mutationFn: (tid: string) => checkInTicket(tid),
    onSuccess: () => {
      toast.success("Check-in berhasil. Anda masuk kolam panggil.");
      qc.invalidateQueries({ queryKey: ["antrean", "my-tickets"] });
    },
    onError: (e: unknown) => toast.error(errMsg(e)),
  });

  const cancel = useMutation({
    mutationFn: (tid: string) => cancelTicket(tid),
    onSuccess: () => {
      toast.info("Nomor antrean dibatalkan.");
      qc.invalidateQueries({ queryKey: ["antrean", "my-tickets"] });
    },
    onError: (e: unknown) => toast.error(errMsg(e)),
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to={`/portal/submissions/${submissionId}`} className="text-sm text-royal-600 hover:underline">
        ← Kembali ke pengajuan
      </Link>
      <h1 className="mt-3 text-2xl font-display font-bold text-ink">Antrean Pengambilan Izin</h1>

      {isLoading ? (
        <p className="mt-6 text-ink-muted">Memuat…</p>
      ) : !ticket || !ACTIVE.includes(ticket.status) ? (
        <EmptyState onTake={() => take.mutate()} pending={take.isPending} hasFinished={!!ticket} />
      ) : (
        <TicketCard
          ticket={ticket}
          onCheckIn={() => checkin.mutate(ticket.id)}
          onCancel={() => cancel.mutate(ticket.id)}
          checkinPending={checkin.isPending}
          cancelPending={cancel.isPending}
        />
      )}
    </div>
  );
}

function EmptyState({
  onTake,
  pending,
  hasFinished,
}: {
  onTake: () => void;
  pending: boolean;
  hasFinished: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-royal-100 bg-white p-6 shadow-sm">
      <p className="text-ink-muted">
        {hasFinished
          ? "Antrean sebelumnya telah selesai. Anda dapat mengambil nomor baru bila diperlukan."
          : "Izin Anda siap diambil di MPP. Ambil nomor antrean online, lalu lakukan check-in saat tiba di lokasi."}
      </p>
      <button
        onClick={onTake}
        disabled={pending}
        className="mt-4 rounded-xl bg-royal-600 px-5 py-2.5 font-semibold text-white hover:bg-royal-700 disabled:opacity-60"
      >
        {pending ? "Memproses…" : "Ambil Nomor Antrean"}
      </button>
    </div>
  );
}

function TicketCard({
  ticket,
  onCheckIn,
  onCancel,
  checkinPending,
  cancelPending,
}: {
  ticket: Ticket;
  onCheckIn: () => void;
  onCancel: () => void;
  checkinPending: boolean;
  cancelPending: boolean;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-royal-100 bg-white shadow-sm">
      <div className="bg-gradient-royal px-6 py-8 text-center text-white">
        <p className="text-sm opacity-80">Nomor Antrean Anda</p>
        <p className="text-6xl font-display font-bold tracking-tight">{ticket.number}</p>
        <p className="mt-1 text-sm opacity-90">{ticket.instansi_name}</p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-royal-50 text-center">
        <Stat label="Status" value={STATUS_LABEL[ticket.status] ?? ticket.status} />
        <Stat
          label="Sisa di depan"
          value={ticket.ahead === null ? "—" : `${ticket.ahead} nomor`}
        />
        <Stat label="Estimasi panggil" value={fmtTime(ticket.estimated_call_at)} />
        <Stat label="Loket" value={ticket.loket_code ?? "—"} />
      </div>

      {ticket.is_demoted && (
        <p className="bg-status-warning/10 px-6 py-2 text-center text-xs text-status-warning">
          Check-in melewati jendela — posisi mengikuti waktu check-in.
        </p>
      )}

      <div className="flex gap-3 p-6">
        {ticket.status === "reserved" && (
          <button
            onClick={onCheckIn}
            disabled={checkinPending}
            className="flex-1 rounded-xl bg-royal-600 px-4 py-2.5 font-semibold text-white hover:bg-royal-700 disabled:opacity-60"
          >
            {checkinPending ? "Memproses…" : "Check-in di Lokasi"}
          </button>
        )}
        {(ticket.status === "reserved" || ticket.status === "in_pool") && (
          <button
            onClick={onCancel}
            disabled={cancelPending}
            className="rounded-xl border border-royal-200 px-4 py-2.5 font-semibold text-ink-muted hover:bg-royal-50 disabled:opacity-60"
          >
            Batalkan
          </button>
        )}
      </div>
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

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { detail?: string } } };
  return ax.response?.data?.detail ?? "Terjadi kesalahan.";
}
