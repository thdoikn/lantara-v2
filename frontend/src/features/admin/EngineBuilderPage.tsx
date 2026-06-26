/**
 * Engine Builder — root page listing all sektors + izin counts.
 * Clicking a sektor drills into IzinListPage.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Edit3, X, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import api from "@/lib/api";
import { toast } from "@/lib/toast";

interface DirektoratOption {
  id: string;
  key: string;
  name: string;
  kedeputian_name: string | null;
}

interface Sektor {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  is_active: boolean;
  pengampu: string;
  pengampu_display?: string;
  direktorats?: DirektoratOption[];
  permit_count: number;
}

interface PermitTypeStub {
  id: string;
  key: string;
  name: string;
  sla_days: number;
  is_published: boolean;
}

// ── Shared modal primitives ───────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 animate-in fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-semibold text-base text-ink">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded text-ink-muted hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 transition-colors";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ── Sektor Modal (Add / Edit) ─────────────────────────────────────────────────

interface SektorForm {
  key: string;
  name: string;
  description: string;
  icon: string;
  order: string;
  direktorat_ids: string[];
  is_active: boolean;
}

const emptySektorForm = (): SektorForm => ({
  key: "",
  name: "",
  description: "",
  icon: "",
  order: "0",
  direktorat_ids: [],
  is_active: true,
});

function SektorModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Sektor;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  const [form, setForm] = useState<SektorForm>(
    initial
      ? {
          key: initial.key,
          name: initial.name,
          description: initial.description,
          icon: initial.icon,
          order: String(initial.order),
          direktorat_ids: (initial.direktorats ?? []).map((d) => d.id),
          is_active: initial.is_active,
        }
      : emptySektorForm()
  );
  const [errors, setErrors] = useState<Partial<Record<keyof SektorForm, string>>>({});
  const [dirSearch, setDirSearch] = useState("");

  const { data: direktorats = [] } = useQuery<DirektoratOption[]>({
    queryKey: ["reference-direktorat"],
    queryFn: () => api.get("/reference/direktorat/").then((r) => r.data),
  });

  function toggleDirektorat(id: string) {
    setForm((f) => ({
      ...f,
      direktorat_ids: f.direktorat_ids.includes(id)
        ? f.direktorat_ids.filter((x) => x !== id)
        : [...f.direktorat_ids, id],
    }));
  }

  const save = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? api.patch(`/admin/engine/sektors/${initial!.key}/`, body)
        : api.post("/admin/engine/sektors/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-engine-sektors"] });
      toast.success(isEdit ? "Sektor diperbarui." : "Sektor ditambahkan.");
      onClose();
    },
    onError: () => toast.error("Gagal menyimpan sektor. Coba lagi."),
  });

  function set(field: keyof SektorForm, value: string | boolean) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "name" && !isEdit) {
        next.key = slugify(value as string);
      }
      return next;
    });
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof SektorForm, string>> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.key.trim()) e.key = "Key wajib diisi";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    save.mutate({
      key: form.key,
      name: form.name,
      description: form.description,
      icon: form.icon,
      order: parseInt(form.order) || 0,
      direktorat_ids: form.direktorat_ids,
      is_active: form.is_active,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Sektor" : "Tambah Sektor"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama Sektor" required error={errors.name}>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="cth. Kesehatan"
          />
        </Field>

        <Field label="Key (slug unik)" required error={errors.key}>
          <input
            className={inputCls}
            value={form.key}
            onChange={(e) => set("key", slugify(e.target.value))}
            placeholder="kesehatan"
            disabled={isEdit}
          />
          {isEdit && <p className="text-xs text-ink-faint mt-0.5">Key tidak dapat diubah setelah sektor dibuat.</p>}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Icon (Lucide/emoji)">
            <input className={inputCls} value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="HeartPulse" />
          </Field>
          <Field label="Urutan tampil">
            <input type="number" min={0} className={inputCls} value={form.order} onChange={(e) => set("order", e.target.value)} />
          </Field>
        </div>

        <Field label="Deskripsi">
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Deskripsi singkat sektor ini"
          />
        </Field>

        <Field label="Direktorat Pengampu">
          {/* Selected chips */}
          {form.direktorat_ids.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.direktorat_ids.map((id) => {
                const d = direktorats.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 bg-royal-50 border border-royal-200 text-royal-700 text-xs font-medium pl-2.5 pr-1 py-1 rounded-full"
                  >
                    {d?.name ?? "Direktorat"}
                    <button
                      type="button"
                      onClick={() => toggleDirektorat(id)}
                      className="rounded-full hover:bg-royal-200/60 p-0.5 transition-colors"
                      aria-label={`Hapus ${d?.name ?? "direktorat"}`}
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {/* Search + checkbox list */}
          <input
            className={inputCls}
            value={dirSearch}
            onChange={(e) => setDirSearch(e.target.value)}
            placeholder="Cari direktorat atau kedeputian…"
          />
          <div className="max-h-44 overflow-y-auto mt-1.5 rounded-lg border border-border divide-y divide-border/60">
            {direktorats.length === 0 ? (
              <p className="text-xs text-ink-faint px-3 py-3 text-center">Memuat daftar direktorat…</p>
            ) : (
              direktorats
                .filter((d) => {
                  const q = dirSearch.trim().toLowerCase();
                  return !q || `${d.name} ${d.kedeputian_name ?? ""}`.toLowerCase().includes(q);
                })
                .map((d) => {
                  const checked = form.direktorat_ids.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDirektorat(d.id)}
                        className="mt-0.5 rounded border-border text-royal-600 focus:ring-royal-500/30"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-ink truncate">{d.name}</span>
                        {d.kedeputian_name && (
                          <span className="block text-xs text-ink-faint truncate">{d.kedeputian_name}</span>
                        )}
                      </span>
                    </label>
                  );
                })
            )}
          </div>
          <p className="text-xs text-ink-faint mt-1">Boleh memilih lebih dari satu direktorat.</p>
        </Field>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="rounded border-border text-royal-600 focus:ring-royal-500/30"
          />
          <span className="text-sm">Sektor aktif (tampil di katalog publik)</span>
        </label>

        {save.isError && (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
            Gagal menyimpan. Periksa kembali data Anda.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            Batal
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-royal-700 text-white font-medium hover:bg-royal-800 disabled:opacity-60 transition-colors"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {save.isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Sektor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EngineBuilderPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [editSektor, setEditSektor] = useState<Sektor | null>(null);

  const { data: sektors, isLoading } = useQuery<{ results: Sektor[] }>({
    queryKey: ["admin-engine-sektors"],
    queryFn: () => api.get("/admin/engine/sektors/").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Engine Builder</h1>
          <p className="text-ink-muted text-sm mt-1">Kelola konfigurasi sektor, izin, alur kerja, dan formulir.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-royal-700 text-white px-4 py-2 text-sm font-medium hover:bg-royal-800 transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Tambah Sektor
        </button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
        {sektors?.results.map((sektor) => (
          <SektorRow key={sektor.key} sektor={sektor} onEdit={() => setEditSektor(sektor)} />
        ))}
        {!sektors?.results.length && (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">
            Belum ada sektor. Klik "Tambah Sektor" untuk memulai.
          </div>
        )}
      </div>

      <SektorModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />

      {editSektor && (
        <SektorModal
          key={editSektor.key}
          open={true}
          onClose={() => setEditSektor(null)}
          initial={editSektor}
        />
      )}
    </div>
  );
}

function SektorRow({ sektor, onEdit }: { sektor: Sektor; onEdit: () => void }) {
  const { data: izinList } = useQuery<{ results: PermitTypeStub[] }>({
    queryKey: ["admin-izin-list", sektor.key],
    queryFn: () => api.get(`/admin/engine/permit-types/?sektor__key=${sektor.key}`).then((r) => r.data),
  });

  const published = izinList?.results.filter((p) => p.is_published).length ?? 0;
  const total = izinList?.results.length ?? 0;

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors group">
      <Link
        to={`/admin/engine/${sektor.key}`}
        className="flex-1 min-w-0 mr-3"
      >
        <p className="font-semibold text-sm group-hover:text-royal-600 transition-colors">{sektor.name}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {published}/{total} izin diterbitkan
          {sektor.pengampu ? ` · ${sektor.pengampu}` : ""}
        </p>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
          sektor.is_active
            ? "bg-status-success/10 text-status-success ring-1 ring-status-success/15"
            : "bg-muted text-ink-muted"
        }`}>
          {sektor.is_active ? "Aktif" : "Nonaktif"}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); onEdit(); }}
          title="Edit sektor"
          className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <Link to={`/admin/engine/${sektor.key}`}>
          <ChevronRight className="w-4 h-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-all" />
        </Link>
      </div>
    </div>
  );
}
