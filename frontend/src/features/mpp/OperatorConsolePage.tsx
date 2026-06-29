import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLoket,
  openLoket,
  closeLoket,
  callNext,
  ticketAction,
  type Loket,
  type Ticket,
  type TicketAction,
} from "./api";
import { toast } from "@/lib/toast";

export default function OperatorConsolePage() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState<Ticket | null>(null);

  const { data: loket, isLoading } = useQuery({
    queryKey: ["antrean", "loket"],
    queryFn: listLoket,
    refetchInterval: 20_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["antrean", "loket"] });

  const toggle = useMutation({
    mutationFn: (l: Loket) => (l.is_open ? closeLoket(l.id) : openLoket(l.id)),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e)),
  });

  const next = useMutation({
    mutationFn: (l: Loket) => callNext(l.id),
    onSuccess: (t) => {
      if (t === null) {
        toast.info("Tidak ada nomor dalam kolam panggil.");
        setCurrent(null);
      } else {
        toast.success(`Memanggil ${t.number}`);
        setCurrent(t);
      }
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: TicketAction }) =>
      ticketAction(id, action),
    onSuccess: (t) => {
      setCurrent(["served", "no_show"].includes(t.status) ? null : t);
      if (t.status === "served") toast.success(`${t.number} selesai dilayani.`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <p className="text-ink-muted">Memuat loket…</p>;

  const lokets = loket ?? [];
  if (lokets.length === 0)
    return <p className="text-ink-muted">Belum ada loket yang ditugaskan kepada Anda.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Loket</h2>
        {lokets.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-2xl border border-royal-100 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold text-ink">{l.code}</p>
              <p className="text-xs text-ink-faint">
                {l.is_open ? "Terbuka" : "Tertutup"}
                {l.operator_name ? ` · ${l.operator_name}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggle.mutate(l)}
                className="rounded-lg border border-royal-200 px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-royal-50"
              >
                {l.is_open ? "Tutup" : "Buka"}
              </button>
              <button
                onClick={() => next.mutate(l)}
                disabled={!l.is_open}
                className="rounded-lg bg-royal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-royal-700 disabled:opacity-50"
              >
                Panggil Berikutnya
              </button>
            </div>
          </div>
        ))}
      </section>

      <aside>
        <h2 className="font-display text-lg font-semibold text-ink">Sedang Dilayani</h2>
        {current ? (
          <div className="mt-3 rounded-2xl border border-royal-100 bg-white p-5 shadow-sm">
            <p className="text-center text-5xl font-display font-bold text-royal-700">
              {current.number}
            </p>
            <p className="mt-1 text-center text-sm text-ink-muted">{current.layanan_name}</p>
            {current.is_priority && (
              <p className="mt-2 text-center text-xs font-semibold text-gold-500">PRIORITAS</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActBtn label="Panggil Ulang" onClick={() => act.mutate({ id: current.id, action: "recall" })} subtle />
              <ActBtn label="Mulai Layani" onClick={() => act.mutate({ id: current.id, action: "serve" })} subtle />
              <ActBtn label="Tidak Hadir" onClick={() => act.mutate({ id: current.id, action: "no-show" })} subtle />
              <ActBtn label="Selesai" onClick={() => act.mutate({ id: current.id, action: "complete" })} />
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-royal-200 bg-white p-6 text-center text-sm text-ink-faint">
            Belum ada nomor yang dipanggil.
          </p>
        )}
      </aside>
    </div>
  );
}

function ActBtn({ label, onClick, subtle }: { label: string; onClick: () => void; subtle?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        subtle
          ? "rounded-lg border border-royal-200 px-3 py-2 text-sm font-medium text-ink-muted hover:bg-royal-50"
          : "rounded-lg bg-status-success px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
      }
    >
      {label}
    </button>
  );
}

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { detail?: string } } };
  return ax.response?.data?.detail ?? "Terjadi kesalahan.";
}
