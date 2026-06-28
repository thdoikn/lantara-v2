import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, ShieldCheck, ShieldPlus, X, Mail, BadgeCheck, CircleSlash, Lock, Clock, Plus, FileCheck2,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import type { PaginatedResponse } from "@/types";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  nik: string;
  jabatan: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_seen: string | null;
  roles: string[];
  direktorat_name: string | null;
  kedeputian_name: string | null;
}

interface Role {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

// Frontend display labels for role keys (backend names differ, e.g. "Verifikator").
const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  verifier: "Verifier",
};
function roleLabel(key: string): string {
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  if (key.startsWith("sektor_admin:")) return "Admin Sektor";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Roles that can be granted/revoked via this screen (never superadmin).
const ASSIGNABLE_KEYS = ["admin", "verifier"];

const ROLE_CHIP: Record<string, string> = {
  superadmin: "bg-terakota-50 text-terakota-700 border-terakota-200",
  admin: "bg-khatulistiwa-50 text-khatulistiwa-700 border-khatulistiwa-100",
  verifier: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function lastSeenLabel(iso: string | null): string {
  if (!iso) return "Belum pernah";
  const d = parseISO(iso);
  // Today → time of day (e.g. 11.30); earlier → date (e.g. 20 Juni 2026).
  return isToday(d) ? format(d, "HH.mm") : format(d, "d MMMM yyyy", { locale: localeId });
}

interface Assignment {
  id: string;
  permit_type_key: string;
  permit_type_name: string;
  sektor_name: string;
  is_active: boolean;
}

interface PermitTypeLite {
  id: string;
  key: string;
  name: string;
  sektor_name: string;
}

// ── Verifier permit-assignment manager ──────────────────────────────────────────
// Controls which permit types a verifier may process. A verifier with no
// assignment has an empty queue (superadmin sees all regardless, so this is
// only shown for non-superadmin verifiers).

function AssignmentManager({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["user-assignments", userId],
    queryFn: () => api.get(`/auth/users/${userId}/assignments/`).then((r) => r.data),
  });

  const { data: permitsData } = useQuery<PaginatedResponse<PermitTypeLite> | PermitTypeLite[]>({
    queryKey: ["permit-types-lite"],
    queryFn: () => api.get("/permit-types/?page_size=200").then((r) => r.data),
  });
  const permits = Array.isArray(permitsData) ? permitsData : permitsData?.results ?? [];

  const active = assignments.filter((a) => a.is_active);
  const assignedKeys = new Set(active.map((a) => a.permit_type_key));
  const needle = q.trim().toLowerCase();
  const candidates = permits.filter(
    (p) =>
      !assignedKeys.has(p.key) &&
      (!needle || `${p.name} ${p.sektor_name}`.toLowerCase().includes(needle)),
  );

  const add = useMutation({
    mutationFn: (permit_type_id: string) =>
      api.post(`/auth/users/${userId}/assignments/`, { permit_type_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-assignments", userId] });
      toast.success("Penugasan ditambahkan.");
    },
    onError: () => toast.error("Gagal menambahkan penugasan."),
  });

  const remove = useMutation({
    mutationFn: (key: string) => api.delete(`/auth/users/${userId}/assignments/${key}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-assignments", userId] });
      toast.success("Penugasan dicabut.");
    },
    onError: () => toast.error("Gagal mencabut penugasan."),
  });

  const busy = add.isPending || remove.isPending;

  return (
    <div className="space-y-2.5 pt-4 mt-1 border-t border-khatulistiwa-100">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-khatulistiwa-600/70 flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
          Penugasan Perizinan
        </p>
        <span className="text-[11px] text-khatulistiwa-400">{active.length} izin</span>
      </div>
      <p className="text-xs text-khatulistiwa-500/70 leading-relaxed">
        Verifikator hanya dapat memproses izin yang ditugaskan. Tanpa penugasan, antreannya kosong.
      </p>

      {/* Current assignments */}
      {active.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {active.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold pl-2.5 pr-1 py-1 rounded-full"
            >
              {a.permit_type_name}
              <button
                onClick={() => remove.mutate(a.permit_type_key)}
                disabled={busy}
                className="rounded-full hover:bg-emerald-200/60 p-0.5 transition-colors disabled:opacity-50"
                aria-label={`Cabut penugasan ${a.permit_type_name}`}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add assignment */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-khatulistiwa-300" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tambah izin… cari nama atau sektor"
          className="w-full bg-white border border-khatulistiwa-100 rounded-lg pl-9 pr-3 py-2 text-sm text-khatulistiwa-900 placeholder-khatulistiwa-300 outline-none focus:border-khatulistiwa-400 focus:ring-2 focus:ring-khatulistiwa-400/15 transition-all"
        />
      </div>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-khatulistiwa-100 divide-y divide-khatulistiwa-50">
        {candidates.length === 0 ? (
          <p className="text-xs text-khatulistiwa-400 px-3 py-3 text-center">
            {permits.length === 0 ? "Memuat daftar izin…" : "Semua izin yang cocok sudah ditugaskan."}
          </p>
        ) : (
          candidates.slice(0, 50).map((p) => (
            <button
              key={p.id}
              onClick={() => add.mutate(p.id)}
              disabled={busy}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-khatulistiwa-50/60 transition-colors disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-khatulistiwa-900 truncate">{p.name}</span>
                <span className="block text-[11px] text-khatulistiwa-400">{p.sektor_name}</span>
              </span>
              <Plus className="w-4 h-4 text-khatulistiwa-500 shrink-0" aria-hidden="true" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeUser, setActiveUser] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<AdminUser>>({
    queryKey: ["admin-users", search],
    queryFn: () =>
      api.get("/auth/users/", { params: search ? { search } : {} }).then((r) => r.data),
  });

  const { data: rolesData } = useQuery<PaginatedResponse<Role> | Role[]>({
    queryKey: ["admin-roles"],
    queryFn: () => api.get("/auth/roles/").then((r) => r.data),
  });

  const roles = Array.isArray(rolesData) ? rolesData : rolesData?.results ?? [];
  const users = data?.results ?? [];

  // Only admin + verifier are assignable here, in a stable order.
  const assignableRoles = ASSIGNABLE_KEYS.map((k) => roles.find((r) => r.key === k)).filter(
    (r): r is Role => Boolean(r),
  );

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleKey }: { userId: string; roleKey: string }) =>
      api.post(`/auth/users/${userId}/assign_role/`, { role_key: roleKey }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Peran ditambahkan."); },
    onError: () => toast.error("Gagal menambahkan peran."),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId, roleKey }: { userId: string; roleKey: string }) =>
      api.post(`/auth/users/${userId}/revoke_role/`, { role_key: roleKey }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Peran dicabut."); },
    onError: () => toast.error("Gagal mencabut peran."),
  });

  const activeIsSuperadmin = activeUser?.roles.includes("superadmin") ?? false;

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-khatulistiwa-900">Pengguna &amp; RBAC</h1>
        <p className="text-khatulistiwa-600/70 text-sm mt-1">
          Kelola akun pengguna dan penetapan peran (role-based access control).
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-khatulistiwa-300" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau NIK…"
          className="w-full bg-white border border-khatulistiwa-100 rounded-xl pl-10 pr-4 py-2.5 text-sm text-khatulistiwa-900 placeholder-khatulistiwa-300 outline-none focus:border-khatulistiwa-400 focus:ring-2 focus:ring-khatulistiwa-400/15 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-khatulistiwa-100 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-khatulistiwa-100 text-[11px] font-bold uppercase tracking-[0.08em] text-khatulistiwa-600/70 text-left">
              <th className="font-bold px-5 py-3">Pengguna</th>
              <th className="font-bold px-3 py-3">Peran</th>
              <th className="font-bold px-3 py-3">Login Terakhir</th>
              <th className="font-bold px-3 py-3">Status</th>
              <th className="font-bold px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-khatulistiwa-100">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="h-16 animate-pulse bg-khatulistiwa-50/50" />
                </tr>
              ))}

            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-khatulistiwa-600/70 text-sm">
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            )}

            {!isLoading &&
              users.map((u) => {
                // Superadmin already implies all access — don't show redundant chips.
                const displayRoles = u.roles.includes("superadmin") ? ["superadmin"] : u.roles;
                return (
                  <tr key={u.id} className="align-middle">
                    {/* Pengguna + jabatan/direktorat/kedeputian */}
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-sm font-semibold text-khatulistiwa-900 truncate">{u.full_name}</p>
                      <p className="text-xs text-khatulistiwa-600/70 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{u.email}</span>
                      </p>
                      {(u.jabatan || u.direktorat_name) && (
                        <p className="text-[11px] text-khatulistiwa-500/70 truncate mt-0.5">
                          {[u.jabatan, u.direktorat_name].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {u.kedeputian_name && (
                        <p className="text-[11px] text-khatulistiwa-400/60 truncate">{u.kedeputian_name}</p>
                      )}
                    </td>

                    {/* Peran */}
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {displayRoles.length === 0 ? (
                          <span className="text-xs text-khatulistiwa-300">Pengguna terdaftar</span>
                        ) : (
                          displayRoles.map((r) => (
                            <span
                              key={r}
                              className={cn(
                                "text-[11px] font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap",
                                ROLE_CHIP[r] ?? "bg-khatulistiwa-50 text-khatulistiwa-700 border-khatulistiwa-100",
                              )}
                            >
                              {roleLabel(r)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Login terakhir */}
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-khatulistiwa-600/70 inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-khatulistiwa-400/60" aria-hidden="true" />
                        {lastSeenLabel(u.last_seen)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-khatulistiwa-400">
                          <CircleSlash className="w-3.5 h-3.5" aria-hidden="true" />
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setActiveUser(u)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-khatulistiwa-600 hover:text-khatulistiwa-800 transition-colors whitespace-nowrap"
                      >
                        <ShieldPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        Kelola Peran
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Role management drawer */}
      {activeUser && (
        <div
          className="fixed inset-0 bg-khatulistiwa-950/40 flex items-center justify-center z-50 px-4"
          onClick={() => setActiveUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-khatulistiwa-900 truncate">{activeUser.full_name}</h2>
                <p className="text-xs text-khatulistiwa-600/70 mt-0.5 truncate">{activeUser.email}</p>
                {(activeUser.jabatan || activeUser.direktorat_name) && (
                  <p className="text-[11px] text-khatulistiwa-500/70 mt-1">
                    {[activeUser.jabatan, activeUser.direktorat_name].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-[11px] text-khatulistiwa-400/70 mt-1">
                  Login terakhir: {lastSeenLabel(activeUser.last_seen)}
                </p>
              </div>
              <button
                onClick={() => setActiveUser(null)}
                className="text-khatulistiwa-400 hover:text-khatulistiwa-700 transition-colors shrink-0"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-khatulistiwa-600/70 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Peran Ditetapkan
              </p>

              {/* Superadmin — locked; already implies admin, verifier & all izin */}
              {activeIsSuperadmin && (
                <div className="rounded-xl border border-terakota-300/50 bg-terakota-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-khatulistiwa-900">Superadmin</p>
                    <Lock className="w-4 h-4 text-terakota-600 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-khatulistiwa-600/70 mt-1 leading-relaxed">
                    Sudah memiliki seluruh akses (admin, verifikator, dan semua perizinan).
                    Peran lain tidak perlu ditetapkan dan tidak dapat diubah di sini.
                  </p>
                </div>
              )}

              {/* Admin/Verifier toggles — hidden for superadmin (redundant) */}
              {!activeIsSuperadmin && assignableRoles.map((role) => {
                const isAssigned = activeUser.roles.includes(role.key);
                const pending = assignMutation.isPending || revokeMutation.isPending;
                return (
                  <label
                    key={role.key}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors",
                      isAssigned
                        ? "bg-khatulistiwa-50 border-khatulistiwa-200"
                        : "bg-white border-khatulistiwa-100 hover:border-khatulistiwa-200",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-khatulistiwa-900">{roleLabel(role.key)}</p>
                      {role.description && (
                        <p className="text-xs text-khatulistiwa-600/70 mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      disabled={pending}
                      onChange={() => {
                        if (isAssigned) {
                          // Revoking access is destructive — confirm first.
                          if (!window.confirm(
                            `Cabut peran "${roleLabel(role.key)}" dari ${activeUser.full_name}? ` +
                            "Pengguna akan kehilangan akses terkait.",
                          )) return;
                          revokeMutation.mutate(
                            { userId: activeUser.id, roleKey: role.key },
                            { onSuccess: () => setActiveUser((u) => u && { ...u, roles: u.roles.filter((r) => r !== role.key) }) },
                          );
                        } else {
                          assignMutation.mutate(
                            { userId: activeUser.id, roleKey: role.key },
                            { onSuccess: () => setActiveUser((u) => u && { ...u, roles: [...u.roles, role.key] }) },
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-khatulistiwa-300 text-khatulistiwa-600 focus:ring-khatulistiwa-400/30 flex-shrink-0"
                    />
                  </label>
                );
              })}
              {!activeIsSuperadmin && assignableRoles.length === 0 && (
                <p className="text-xs text-khatulistiwa-400">Belum ada peran yang dapat ditetapkan.</p>
              )}
            </div>

            {/* Permit assignments — only relevant for a (non-superadmin) verifier */}
            {!activeIsSuperadmin && activeUser.roles.includes("verifier") && (
              <AssignmentManager userId={activeUser.id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
