import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PhoneCall,
  RotateCcw,
  Play,
  CheckCircle2,
  UserX,
  DoorOpen,
  DoorClosed,
  Loader2,
  Star,
} from "lucide-react";
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
import { errMsg } from "./queueStatus";
import { StatusBadge } from "./QueueUI";
import { toast } from "@/lib/toast";

export default function OperatorConsolePage() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState<Ticket | null>(null);

  const { data: loket, isLoading } = useQuery({
    queryKey: ["antrean", "loket"],
    queryFn: listLoket,
    refetchInterval: 15_000,
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
    mutationFn: ({ id, action }: { id: string; action: TicketAction }) => ticketAction(id, action),
    onSuccess: (t) => {
      setCurrent(["served", "no_show"].includes(t.status) ? null : t);
      if (t.status === "served") toast.success(`${t.number} selesai dilayani.`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading)
    return (
      <div className="flex items-center gap-3 text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat loket…
      </div>
    );

  const lokets = loket ?? [];
  if (lokets.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-royal-200 bg-white p-8 text-center text-ink-muted">
        Belum ada loket yang ditugaskan kepada Anda.
      </p>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Loket</h2>
        {lokets.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-2xl border border-royal-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                  l.is_open ? "bg-status-success/15 text-status-success" : "bg-ink-faint/10 text-ink-faint"
                }`}
              >
                {l.code.replace(/\D/g, "") || "•"}
              </span>
              <div>
                <p className="font-semibold text-ink">{l.code}</p>
                <p className="text-xs text-ink-faint">
                  {l.is_open ? "Terbuka" : "Tertutup"}
                  {l.operator_name ? ` · ${l.operator_name}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggle.mutate(l)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-royal-200 px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-royal-50"
              >
                {l.is_open ? <DoorClosed className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
                {l.is_open ? "Tutup" : "Buka"}
              </button>
              <button
                onClick={() => next.mutate(l)}
                disabled={!l.is_open || next.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-royal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-royal-700 disabled:opacity-50"
              >
                <PhoneCall className="h-4 w-4" /> Panggil Berikutnya
              </button>
            </div>
          </div>
        ))}
      </section>

      <aside>
        <h2 className="font-display text-lg font-semibold text-ink">Sedang Ditangani</h2>
        {current ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-royal-100 bg-white shadow-sm">
            <div className="bg-gradient-royal px-5 py-6 text-center text-white">
              <p className="font-display text-6xl font-bold">{current.number}</p>
              <p className="mt-1 text-sm text-royal-100">{current.layanan_name}</p>
              {current.is_priority && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-bold text-royal-950">
                  <Star className="h-3 w-3 fill-royal-950" /> PRIORITAS
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 border-b border-royal-50 py-3">
              <StatusBadge status={current.status} size="sm" />
              {current.recall_count > 0 && (
                <span className="text-xs text-ink-faint">Dipanggil ulang {current.recall_count}×</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <ActBtn
                label="Panggil Ulang"
                icon={RotateCcw}
                onClick={() => act.mutate({ id: current.id, action: "recall" })}
                subtle
              />
              <ActBtn
                label="Mulai Layani"
                icon={Play}
                onClick={() => act.mutate({ id: current.id, action: "serve" })}
                subtle
              />
              <ActBtn
                label="Tidak Hadir"
                icon={UserX}
                onClick={() => act.mutate({ id: current.id, action: "no-show" })}
                subtle
                danger
              />
              <ActBtn
                label="Selesai"
                icon={CheckCircle2}
                onClick={() => act.mutate({ id: current.id, action: "complete" })}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-royal-200 bg-white p-8 text-center text-sm text-ink-faint">
            Belum ada nomor yang dipanggil. Tekan <b>Panggil Berikutnya</b> pada loket Anda.
          </p>
        )}
      </aside>
    </div>
  );
}

function ActBtn({
  label,
  icon: Icon,
  onClick,
  subtle,
  danger,
}: {
  label: string;
  icon: typeof Play;
  onClick: () => void;
  subtle?: boolean;
  danger?: boolean;
}) {
  const cls = danger
    ? "border border-status-danger/30 text-status-danger hover:bg-status-danger/5"
    : subtle
      ? "border border-royal-200 text-ink-muted hover:bg-royal-50"
      : "bg-status-success text-white hover:opacity-90";
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold ${cls}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
