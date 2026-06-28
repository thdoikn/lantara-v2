/**
 * Lists all izin for a sektor; links to the builder for each.
 * Includes Tambah Izin and Edit Izin modals.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Eye, EyeOff, Edit3, X, Loader2, Copy, Search, AlertCircle, FilePlus2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import api from "@/lib/api";
import { toast } from "@/lib/toast";

interface PermitType {
  id: string;
  key: string;
  name: string;
  description: string;
  sla_days: number;
  is_published: boolean;
  schema_version: number;
  product_name: string;
  legal_basis: string[];
  fee_description: string;
  has_unpublished_changes?: boolean;
  is_publish_ready?: boolean;
  readiness_missing?: string[];
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

function Field({ label, required, error, hint, children }: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
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

// ── Izin Modal (Add / Edit) ───────────────────────────────────────────────────

interface IzinForm {
  key: string;
  name: string;
  description: string;
  sla_days: string;
  product_name: string;
  legal_basis_text: string;
  fee_description: string;
}

function IzinModal({
  open,
  onClose,
  sektorKey,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  sektorKey: string;
  initial?: PermitType;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  const [form, setForm] = useState<IzinForm>(
    initial
      ? {
          key: initial.key,
          name: initial.name,
          description: initial.description,
          sla_days: String(initial.sla_days),
          product_name: initial.product_name,
          legal_basis_text: initial.legal_basis.join("\n"),
          fee_description: initial.fee_description,
        }
      : { key: "", name: "", description: "", sla_days: "8", product_name: "", legal_basis_text: "", fee_description: "" }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof IzinForm, string>>>({});

  const save = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? api.patch(`/admin/engine/permit-types/${initial!.key}/`, body)
        : api.post("/admin/engine/permit-types/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-izin-list", sektorKey] });
      toast.success(isEdit ? "Izin diperbarui." : "Izin ditambahkan.");
      onClose();
    },
    onError: () => toast.error("Gagal menyimpan izin. Coba lagi."),
  });

  function set(field: keyof IzinForm, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "name" && !isEdit) {
        next.key = slugify(sektorKey + "-" + value);
      }
      return next;
    });
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof IzinForm, string>> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.key.trim()) e.key = "Key wajib diisi";
    if (!form.sla_days || isNaN(Number(form.sla_days))) e.sla_days = "SLA harus berupa angka";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    save.mutate({
      sektor: sektorKey,
      key: form.key,
      name: form.name,
      description: form.description,
      sla_days: parseInt(form.sla_days),
      product_name: form.product_name,
      legal_basis: form.legal_basis_text.split("\n").map((s) => s.trim()).filter(Boolean),
      fee_description: form.fee_description,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Izin" : "Tambah Jenis Izin"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama Izin" required error={errors.name}>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="cth. Izin Mendirikan Bangunan"
          />
        </Field>

        <Field label="Key (slug unik)" required error={errors.key} hint={isEdit ? "Key tidak dapat diubah setelah izin dibuat." : undefined}>
          <input
            className={inputCls}
            value={form.key}
            onChange={(e) => set("key", slugify(e.target.value))}
            placeholder="sosial-lks-berbadan-hukum"
            disabled={isEdit}
          />
        </Field>

        <Field label="Jangka Waktu Layanan (hari)" required error={errors.sla_days}>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={form.sla_days}
            onChange={(e) => set("sla_days", e.target.value)}
          />
        </Field>

        <Field label="Nama Produk / Output">
          <input
            className={inputCls}
            value={form.product_name}
            onChange={(e) => set("product_name", e.target.value)}
            placeholder="cth. Sertifikat LKS"
          />
        </Field>

        <Field label="Deskripsi">
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <Field label="Dasar Hukum" hint="Satu dasar hukum per baris">
          <textarea
            className={inputCls + " resize-none font-mono text-xs"}
            rows={3}
            value={form.legal_basis_text}
            onChange={(e) => set("legal_basis_text", e.target.value)}
            placeholder={"Perda No. 1 Tahun 2024\nPeraturan Kepala Otorita IKN No. 2 Tahun 2024"}
          />
        </Field>

        <Field label="Keterangan Biaya">
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            value={form.fee_description}
            onChange={(e) => set("fee_description", e.target.value)}
            placeholder="Tidak dipungut biaya (gratis)"
          />
        </Field>

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
            {save.isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Izin"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Clone Modal ───────────────────────────────────────────────────────────────

function CloneModal({
  open,
  onClose,
  source,
  sektorKey,
}: {
  open: boolean;
  onClose: () => void;
  source: PermitType;
  sektorKey: string;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(`${source.name} (Salinan)`);
  const [key, setKey] = useState(slugify(`${source.key}-copy`));
  const [error, setError] = useState<string | null>(null);

  const clone = useMutation({
    mutationFn: () =>
      api.post(`/admin/engine/permit-types/${source.key}/clone/`, { new_key: key, new_name: name }),
    onSuccess: (res) => {
      toast.success("Izin diduplikat. Buka untuk menyunting salinan.");
      onClose();
      navigate(`/admin/engine/${sektorKey}/${res.data.key}`);
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Gagal menduplikat izin.");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={`Duplikat: ${source.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Menyalin seluruh tahap, field, dan persyaratan ke izin baru (status draft).
        </p>
        <Field label="Nama Izin Baru" required>
          <input className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setError(null); }} />
        </Field>
        <Field label="Key (slug unik)" required error={error ?? undefined}>
          <input className={inputCls} value={key} onChange={(e) => { setKey(slugify(e.target.value)); setError(null); }} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            Batal
          </button>
          <button
            onClick={() => clone.mutate()}
            disabled={clone.isPending || !name.trim() || !key.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-royal-700 text-white font-medium hover:bg-royal-800 disabled:opacity-60 transition-colors"
          >
            {clone.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {clone.isPending ? "Menduplikat…" : "Duplikat"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IzinListPage() {
  const { sektorKey } = useParams<{ sektorKey: string }>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editIzin, setEditIzin] = useState<PermitType | null>(null);
  const [cloneIzin, setCloneIzin] = useState<PermitType | null>(null);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery<{ results: PermitType[] }>({
    queryKey: ["admin-izin-list", sektorKey],
    queryFn: () =>
      api.get(`/admin/engine/permit-types/?sektor__key=${sektorKey}&page_size=50`).then((r) => r.data),
    enabled: !!sektorKey,
  });

  const all = useMemo(() => data?.results ?? [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((p) => p.name.toLowerCase().includes(q) || p.key.includes(q)) : all;
  }, [all, query]);
  const needsAttention = all.filter((p) => p.has_unpublished_changes || !p.is_publish_ready).length;

  const togglePublish = useMutation({
    mutationFn: ({ key, published }: { key: string; published: boolean }) =>
      api.post(`/admin/engine/permit-types/${key}/${published ? "unpublish" : "publish"}/`),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-izin-list", sektorKey] });
      toast.success(v.published ? "Izin disembunyikan dari publik." : "Izin dipublikasikan.");
    },
    onError: (err: unknown) => {
      // Surface the publish-readiness gate (backend returns { detail, errors }).
      const data = (err as { response?: { data?: { detail?: string; errors?: Record<string, string> } } })
        ?.response?.data;
      const reasons = data?.errors ? Object.values(data.errors) : [];
      if (reasons.length) {
        toast.error(`${data?.detail ?? "Izin belum siap diterbitkan."} ${reasons.join(" ")}`);
      } else {
        toast.error("Gagal mengubah status publikasi.");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-xs text-ink-muted mb-1">
            <Link to="/admin/engine" className="hover:text-ink">Engine Builder</Link>
            <span className="mx-1">›</span>
            <span className="capitalize">{sektorKey}</span>
          </nav>
          <h1 className="font-display text-2xl font-bold capitalize">{sektorKey}</h1>
          <p className="text-ink-muted text-sm flex items-center gap-2">
            {all.length} jenis izin
            {needsAttention > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                <AlertCircle className="w-3 h-3" aria-hidden="true" /> {needsAttention} perlu perhatian
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-royal-700 text-white px-4 py-2 text-sm font-medium hover:bg-royal-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Izin
        </button>
      </div>

      {all.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 max-w-sm">
          <Search className="w-4 h-4 text-ink-faint shrink-0" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari izin…"
            className="flex-1 bg-transparent text-sm outline-none placeholder-ink-faint"
            aria-label="Cari izin"
          />
          {query && <button onClick={() => setQuery("")} aria-label="Hapus"><X className="w-4 h-4 text-ink-faint hover:text-ink" /></button>}
        </div>
      )}

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {filtered.map((pt) => (
          <div key={pt.key} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 group">
            <Link
              to={`/admin/engine/${sektorKey}/${pt.key}`}
              className="flex-1 flex items-center gap-4 min-w-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{pt.name}</p>
                  {pt.has_unpublished_changes && pt.is_published && (
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-500">
                      Perubahan belum terbit
                    </span>
                  )}
                  {pt.is_publish_ready === false && (
                    <span
                      title={(pt.readiness_missing ?? []).join("\n")}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"
                    >
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      Belum siap
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  SLA {pt.sla_days} hari · v{pt.schema_version}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 ml-4 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  pt.is_published
                    ? "bg-status-success/10 text-status-success"
                    : "bg-muted text-ink-muted"
                }`}
              >
                {pt.is_published ? "Diterbitkan" : "Draft"}
              </span>
              <button
                onClick={(e) => { e.preventDefault(); setCloneIzin(pt); }}
                title="Duplikat izin"
                className="p-1 text-ink-muted hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setEditIzin(pt); }}
                title="Edit izin"
                className="p-1 text-ink-muted hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  togglePublish.mutate({ key: pt.key, published: pt.is_published });
                }}
                title={pt.is_published ? "Nonaktifkan" : "Terbitkan"}
                className="p-1 text-ink-muted hover:text-ink transition-colors"
              >
                {pt.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <Link to={`/admin/engine/${sektorKey}/${pt.key}`} className="p-1 text-ink-muted hover:text-ink">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
        {all.length > 0 && filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">
            Tidak ada izin yang cocok dengan "{query}".
          </div>
        )}
        {all.length === 0 && (
          <div className="px-5 py-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <FilePlus2 className="w-6 h-6 text-ink-faint" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-ink">Belum ada izin di sektor ini</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-royal-700 text-white px-4 py-2 text-sm font-medium hover:bg-royal-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Buat izin pertama
            </button>
          </div>
        )}
      </div>

      {sektorKey && (
        <>
          <IzinModal
            open={showAdd}
            onClose={() => setShowAdd(false)}
            sektorKey={sektorKey}
          />
          {editIzin && (
            <IzinModal
              key={editIzin.key}
              open={true}
              onClose={() => setEditIzin(null)}
              sektorKey={sektorKey}
              initial={editIzin}
            />
          )}
          {cloneIzin && (
            <CloneModal
              key={`clone-${cloneIzin.key}`}
              open={true}
              onClose={() => setCloneIzin(null)}
              source={cloneIzin}
              sektorKey={sektorKey}
            />
          )}
        </>
      )}
    </div>
  );
}
