import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, DoorOpen, DoorClosed, X, Loader2 } from "lucide-react";
import {
  listLoket,
  createLoket,
  updateLoket,
  deleteLoket,
  type Loket,
} from "../api";
import { errMsg } from "../queueStatus";
import { useTenantScope } from "../TenantLayout";
import { toast } from "@/lib/toast";

export default function TenantLoketsPage() {
  const { tenant } = useTenantScope();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Loket | "new" | null>(null);

  const { data: allLoket, isLoading } = useQuery({
    queryKey: ["antrean", "loket"],
    queryFn: listLoket,
  });
  const lokets = useMemo(
    () => (allLoket ?? []).filter((l) => l.instansi === tenant.id),
    [allLoket, tenant.id],
  );

  const remove = useMutation({
    mutationFn: (id: string) => deleteLoket(id),
    onSuccess: () => {
      toast.info("Loket dihapus.");
      qc.invalidateQueries({ queryKey: ["antrean", "loket"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      <Header
        title="Loket"
        subtitle={`Kelola loket untuk ${tenant.name}.`}
        action={
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500"
          >
            <Plus className="h-4 w-4" /> Tambah Loket
          </button>
        }
      />

      {isLoading ? (
        <Loading />
      ) : lokets.length === 0 ? (
        <Empty text="Belum ada loket. Tambahkan loket pertama Anda." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lokets.map((l) => (
            <div key={l.id} className="rounded-2xl border border-pertiwi-muted bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-bold text-khatulistiwa-900">{l.code}</p>
                  {l.name && <p className="text-xs text-khatulistiwa-500/80">{l.name}</p>}
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    l.is_open
                      ? "bg-status-success/15 text-status-success"
                      : "bg-khatulistiwa-100 text-khatulistiwa-500"
                  }`}
                >
                  {l.is_open ? <DoorOpen className="h-3 w-3" /> : <DoorClosed className="h-3 w-3" />}
                  {l.is_open ? "Buka" : "Tutup"}
                </span>
              </div>
              <p className="mt-3 text-xs text-khatulistiwa-500/80">
                {l.layanan.length} layanan dilayani
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditing(l)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pertiwi-muted px-3 py-1.5 text-sm font-medium text-khatulistiwa-700 hover:bg-pertiwi-warm"
                >
                  <Pencil className="h-3.5 w-3.5" /> Ubah
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Hapus loket ${l.code}?`)) remove.mutate(l.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-status-danger hover:bg-status-danger/5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <LoketDialog
          loket={editing === "new" ? null : editing}
          tenantId={tenant.id}
          services={tenant.layanan}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["antrean", "loket"] });
          }}
        />
      )}
    </div>
  );
}

function LoketDialog({
  loket,
  tenantId,
  services,
  onClose,
  onSaved,
}: {
  loket: Loket | null;
  tenantId: string;
  services: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(loket?.code ?? "");
  const [name, setName] = useState(loket?.name ?? "");
  const [layanan, setLayanan] = useState<string[]>(loket?.layanan ?? []);

  const save = useMutation({
    mutationFn: () =>
      loket
        ? updateLoket(loket.id, { code, name, layanan })
        : createLoket({ instansi: tenantId, code, name, layanan }),
    onSuccess: () => {
      toast.success("Loket disimpan.");
      onSaved();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  function toggle(id: string) {
    setLayanan((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <Modal title={loket ? `Ubah ${loket.code}` : "Tambah Loket"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Kode Loket">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="mis. Loket A1"
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
          />
        </Field>
        <Field label="Nama (opsional)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
          />
        </Field>
        <Field label="Layanan yang dilayani">
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-khatulistiwa-800">
                <input
                  type="checkbox"
                  checked={layanan.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 rounded border-pertiwi-muted"
                />
                {s.name}
              </label>
            ))}
            {services.length === 0 && (
              <p className="text-xs text-khatulistiwa-400">Belum ada layanan pada tenant ini.</p>
            )}
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-khatulistiwa-500">
            Batal
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!code.trim() || save.isPending}
            className="rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-60"
          >
            {save.isPending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── small shared bits (tenant portal) ────────────────────────────────────────

export function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-khatulistiwa-900">{title}</h1>
        {subtitle && <p className="text-sm text-khatulistiwa-500/80">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center gap-3 text-khatulistiwa-500/70">
      <Loader2 className="h-5 w-5 animate-spin" /> Memuat…
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-pertiwi-muted bg-white p-8 text-center text-khatulistiwa-500/70">
      {text}
    </p>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-khatulistiwa-700">{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-khatulistiwa-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-khatulistiwa-900">{title}</h2>
          <button onClick={onClose} className="text-khatulistiwa-400 hover:text-khatulistiwa-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
