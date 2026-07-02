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
  Shuffle,
  Users,
} from "lucide-react";
import {
  listLoket,
  openLoket,
  closeLoket,
  callNext,
  ticketAction,
  retriageTicket,
  loketQueue,
  listInstansi,
  type Loket,
  type Ticket,
  type TicketAction,
} from "./api";
import { errMsg } from "./queueStatus";
import { StatusBadge } from "./QueueUI";
import { Modal, Field } from "./tenant/TenantLoketsPage";
import { toast } from "@/lib/toast";

export default function OperatorConsolePage() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState<Ticket | null>(null);
  const [retriaging, setRetriaging] = useState(false);

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
      qc.invalidateQueries({ queryKey: ["antrean", "loket-queue"] });
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
      <div className="flex items-center gap-3 text-khatulistiwa-500/70">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat loket…
      </div>
    );

  const lokets = loket ?? [];
  if (lokets.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-pertiwi-muted bg-white p-8 text-center text-khatulistiwa-500/70">
        Belum ada loket yang ditugaskan kepada Anda.
      </p>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-khatulistiwa-900">Loket</h2>
        {lokets.map((l) => (
          <LoketCard
            key={l.id}
            loket={l}
            onToggle={() => toggle.mutate(l)}
            onCallNext={() => next.mutate(l)}
            calling={next.isPending}
          />
        ))}
      </section>

      <aside>
        <h2 className="font-display text-lg font-semibold text-khatulistiwa-900">Sedang Ditangani</h2>
        {current ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-pertiwi-muted bg-white shadow-sm">
            <div className="bg-gradient-hero px-5 py-6 text-center text-white">
              <p className="font-display text-6xl font-bold">{current.number}</p>
              <p className="mt-1 text-sm text-khatulistiwa-200/80">{current.layanan_name}</p>
              {current.is_priority && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-terakota-500 px-2.5 py-0.5 text-xs font-bold text-khatulistiwa-900">
                  <Star className="h-3 w-3 fill-khatulistiwa-900" /> PRIORITAS
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 border-b border-pertiwi-muted py-3">
              <StatusBadge status={current.status} size="sm" />
              {current.recall_count > 0 && (
                <span className="text-xs text-khatulistiwa-400">
                  Dipanggil ulang {current.recall_count}×
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <ActBtn label="Panggil Ulang" icon={RotateCcw} onClick={() => act.mutate({ id: current.id, action: "recall" })} subtle />
              <ActBtn label="Mulai Layani" icon={Play} onClick={() => act.mutate({ id: current.id, action: "serve" })} subtle />
              <ActBtn label="Koreksi Layanan" icon={Shuffle} onClick={() => setRetriaging(true)} subtle />
              <ActBtn label="Tidak Hadir" icon={UserX} onClick={() => act.mutate({ id: current.id, action: "no-show" })} subtle danger />
              <div className="col-span-2">
                <ActBtn label="Selesai" icon={CheckCircle2} onClick={() => act.mutate({ id: current.id, action: "complete" })} />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-pertiwi-muted bg-white p-8 text-center text-sm text-khatulistiwa-400">
            Belum ada nomor yang dipanggil. Tekan <b>Panggil Berikutnya</b> pada loket Anda.
          </p>
        )}
      </aside>

      {retriaging && current && (
        <RetriageDialog
          ticket={current}
          onClose={() => setRetriaging(false)}
          onDone={(t) => {
            setCurrent(t);
            setRetriaging(false);
            qc.invalidateQueries({ queryKey: ["antrean", "loket-queue"] });
          }}
        />
      )}
    </div>
  );
}

function LoketCard({
  loket,
  onToggle,
  onCallNext,
  calling,
}: {
  loket: Loket;
  onToggle: () => void;
  onCallNext: () => void;
  calling: boolean;
}) {
  const { data: queue } = useQuery({
    queryKey: ["antrean", "loket-queue", loket.id],
    queryFn: () => loketQueue(loket.id),
    enabled: loket.is_open,
    refetchInterval: 10_000,
  });

  return (
    <div className="rounded-2xl border border-pertiwi-muted bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
              loket.is_open ? "bg-status-success/15 text-status-success" : "bg-khatulistiwa-100 text-khatulistiwa-500"
            }`}
          >
            {loket.code.replace(/\D/g, "") || "•"}
          </span>
          <div>
            <p className="font-semibold text-khatulistiwa-900">{loket.code}</p>
            <p className="text-xs text-khatulistiwa-400">
              {loket.is_open ? "Terbuka" : "Tertutup"}
              {loket.operator_name ? ` · ${loket.operator_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-pertiwi-muted px-3 py-1.5 text-sm font-medium text-khatulistiwa-700 hover:bg-pertiwi-warm"
          >
            {loket.is_open ? <DoorClosed className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
            {loket.is_open ? "Tutup" : "Buka"}
          </button>
          <button
            onClick={onCallNext}
            disabled={!loket.is_open || calling}
            className="inline-flex items-center gap-1.5 rounded-lg bg-khatulistiwa-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-50"
          >
            <PhoneCall className="h-4 w-4" /> Panggil Berikutnya
          </button>
        </div>
      </div>

      {loket.is_open && queue && (
        <div className="mt-3 flex items-center gap-3 border-t border-pertiwi-muted pt-3 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-khatulistiwa-600">
            <Users className="h-3.5 w-3.5" /> {queue.waiting} menunggu
          </span>
          {queue.next_up.length > 0 && (
            <span className="text-khatulistiwa-400">
              Berikutnya:{" "}
              {queue.next_up.slice(0, 5).map((t) => (
                <span
                  key={t.id}
                  className={`ml-1 rounded px-1.5 py-0.5 font-semibold ${
                    t.is_priority ? "bg-terakota-500/15 text-amber-700" : "bg-khatulistiwa-50 text-khatulistiwa-700"
                  }`}
                >
                  {t.number}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RetriageDialog({
  ticket,
  onClose,
  onDone,
}: {
  ticket: Ticket;
  onClose: () => void;
  onDone: (t: Ticket) => void;
}) {
  const [target, setTarget] = useState("");
  const { data: tenants } = useQuery({ queryKey: ["antrean", "instansi"], queryFn: listInstansi });
  // Sibling services = services of the instansi that owns this ticket's service.
  const instansi = (tenants ?? []).find((t) => t.layanan.some((l) => l.id === ticket.layanan));
  const options = (instansi?.layanan ?? []).filter((l) => l.id !== ticket.layanan);

  const save = useMutation({
    mutationFn: () => retriageTicket(ticket.id, target),
    onSuccess: (t) => {
      toast.success(`Dialihkan ke ${t.layanan_name} — nomor ${t.number}.`);
      onDone(t);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal title={`Koreksi Layanan — ${ticket.number}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-khatulistiwa-500/80">
          Pindahkan pemohon ke layanan lain bila salah pilih. Dalam instansi sama, waktu ambil
          dipertahankan.
        </p>
        <Field label="Layanan tujuan">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
          >
            <option value="">Pilih layanan…</option>
            {options.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-khatulistiwa-500">
            Batal
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!target || save.isPending}
            className="rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-60"
          >
            {save.isPending ? "Memproses…" : "Alihkan"}
          </button>
        </div>
      </div>
    </Modal>
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
      ? "border border-pertiwi-muted text-khatulistiwa-700 hover:bg-pertiwi-warm"
      : "bg-status-success text-white hover:opacity-90";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold ${cls}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
