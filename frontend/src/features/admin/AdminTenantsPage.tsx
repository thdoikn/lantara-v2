import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Building2, UserPlus, Search, X, Loader2 } from "lucide-react";
import {
  adminListInstansi,
  createInstansi,
  deleteInstansi,
  listStaff,
  createStaff,
  deleteStaff,
  searchStaffUsers,
  type Instansi,
  type StaffUser,
} from "../mpp/api";
import { errMsg } from "../mpp/queueStatus";
import { toast } from "@/lib/toast";

/** Admin portal — register MPP tenants and assign their tenant admins. */
export default function AdminTenantsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState<Instansi | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["antrean", "admin-instansi"],
    queryFn: adminListInstansi,
  });
  const { data: staff } = useQuery({ queryKey: ["antrean", "staff"], queryFn: listStaff });

  const adminsFor = (id: string) =>
    (staff ?? []).filter((s) => s.instansi === id && s.role_scope === "tenant_admin");

  const remove = useMutation({
    mutationFn: (id: string) => deleteInstansi(id),
    onSuccess: () => {
      toast.info("Tenant dihapus.");
      qc.invalidateQueries({ queryKey: ["antrean", "admin-instansi"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-khatulistiwa-900">Tenant MPP</h1>
          <p className="text-sm text-khatulistiwa-500/80">
            Instansi peserta MPP (OIKN & eksternal) dan admin tenant-nya.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500"
        >
          <Plus className="h-4 w-4" /> Tambah Tenant
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-khatulistiwa-500/70">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat…
        </div>
      ) : (
        <div className="space-y-3">
          {(tenants ?? []).map((t) => (
            <div key={t.id} className="rounded-2xl border border-pertiwi-muted bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-khatulistiwa-800">
                    <Building2 className="h-5 w-5 text-terakota-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-khatulistiwa-900">{t.name}</p>
                    <p className="text-xs text-khatulistiwa-400">
                      {t.owner_type === "oikn" ? "Otorita IKN" : "Instansi Eksternal"} ·{" "}
                      {t.layanan.length} layanan
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAssignFor(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-pertiwi-muted px-3 py-1.5 text-sm font-medium text-khatulistiwa-700 hover:bg-pertiwi-warm"
                  >
                    <UserPlus className="h-4 w-4" /> Admin Tenant
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus tenant ${t.name}? Ini menghapus loket & layanannya.`))
                        remove.mutate(t.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-status-danger hover:bg-status-danger/5"
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </button>
                </div>
              </div>
              {adminsFor(t.id).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-pertiwi-muted pt-3">
                  {adminsFor(t.id).map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-khatulistiwa-50 px-2.5 py-1 text-xs text-khatulistiwa-700"
                    >
                      {a.user_name}
                      <button
                        onClick={() => deleteStaff(a.id).then(() => qc.invalidateQueries({ queryKey: ["antrean", "staff"] }))}
                        className="text-khatulistiwa-400 hover:text-status-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreateTenantDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["antrean", "admin-instansi"] });
          }}
        />
      )}
      {assignFor && (
        <AssignAdminDialog
          tenant={assignFor}
          onClose={() => setAssignFor(null)}
          onSaved={() => {
            setAssignFor(null);
            qc.invalidateQueries({ queryKey: ["antrean", "staff"] });
          }}
        />
      )}
    </div>
  );
}

function CreateTenantDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [owner, setOwner] = useState<"oikn" | "external">("oikn");

  const save = useMutation({
    mutationFn: () =>
      createInstansi({ name, key: key || slugify(name), short_name: name, owner_type: owner }),
    onSuccess: () => {
      toast.success("Tenant dibuat.");
      onSaved();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Dialog title="Tambah Tenant" onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Nama tenant">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. BPJS Ketenagakerjaan"
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
          />
        </FieldRow>
        <FieldRow label="Key (slug, opsional)">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={name ? slugify(name) : "otomatis dari nama"}
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
          />
        </FieldRow>
        <FieldRow label="Jenis">
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value as "oikn" | "external")}
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
          >
            <option value="oikn">Otorita IKN</option>
            <option value="external">Instansi Eksternal</option>
          </select>
        </FieldRow>
        <DialogActions
          onClose={onClose}
          onSave={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
          saving={save.isPending}
        />
      </div>
    </Dialog>
  );
}

function AssignAdminDialog({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Instansi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<StaffUser | null>(null);
  const { data: results } = useQuery({
    queryKey: ["antrean", "staff-users", "tenant_admin", q],
    queryFn: () => searchStaffUsers(q, "tenant_admin"),
    enabled: !picked,
  });

  const save = useMutation({
    mutationFn: () =>
      createStaff({ user: picked!.id, instansi: tenant.id, role_scope: "tenant_admin" }),
    onSuccess: () => {
      toast.success("Admin tenant ditetapkan.");
      onSaved();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Dialog title={`Admin Tenant — ${tenant.name}`} onClose={onClose}>
      <div className="space-y-4">
        {!picked ? (
          <FieldRow label="Cari pengguna berperan Admin Tenant">
            <div className="flex items-center gap-2 rounded-xl border border-pertiwi-muted px-3 py-2">
              <Search className="h-4 w-4 text-khatulistiwa-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="nama atau email…"
                className="w-full outline-none"
              />
            </div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {(results ?? []).map((u) => (
                <button
                  key={u.id}
                  onClick={() => setPicked(u)}
                  className="flex w-full flex-col rounded-lg px-3 py-1.5 text-left hover:bg-pertiwi-warm"
                >
                  <span className="text-sm font-medium text-khatulistiwa-900">{u.full_name}</span>
                  <span className="text-xs text-khatulistiwa-400">{u.email}</span>
                </button>
              ))}
              {results && results.length === 0 && (
                <p className="px-1 py-2 text-xs text-khatulistiwa-400">
                  Belum ada pengguna dengan peran Admin Tenant. Beri peran tersebut di menu
                  Pengguna &amp; RBAC lebih dulu.
                </p>
              )}
            </div>
          </FieldRow>
        ) : (
          <div className="rounded-xl bg-pertiwi-warm p-3">
            <p className="text-sm font-medium text-khatulistiwa-900">{picked.full_name}</p>
            <p className="text-xs text-khatulistiwa-400">{picked.email}</p>
            <button onClick={() => setPicked(null)} className="mt-1 text-xs text-khatulistiwa-600 hover:underline">
              Ganti
            </button>
          </div>
        )}
        <DialogActions
          onClose={onClose}
          onSave={() => save.mutate()}
          disabled={!picked || save.isPending}
          saving={save.isPending}
          saveLabel="Tetapkan"
        />
      </div>
    </Dialog>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── tiny dialog primitives ────────────────────────────────────────────────────
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-khatulistiwa-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-khatulistiwa-700">{label}</span>
      {children}
    </label>
  );
}
function DialogActions({
  onClose,
  onSave,
  disabled,
  saving,
  saveLabel = "Simpan",
}: {
  onClose: () => void;
  onSave: () => void;
  disabled: boolean;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-khatulistiwa-500">
        Batal
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className="rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-60"
      >
        {saving ? "Menyimpan…" : saveLabel}
      </button>
    </div>
  );
}
