import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Search, ShieldCheck, ShieldPlus, X, Mail, BadgeCheck, CircleSlash, Lock, Clock } from "lucide-react";
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
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: localeId });
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
      <div className="bg-white border border-khatulistiwa-100 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.6fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-khatulistiwa-100 text-[11px] font-bold uppercase tracking-[0.08em] text-khatulistiwa-600/70">
          <span>Pengguna</span>
          <span>Peran</span>
          <span>Login Terakhir</span>
          <span>Status</span>
          <span className="sr-only">Aksi</span>
        </div>

        {isLoading && (
          <div className="divide-y divide-khatulistiwa-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-khatulistiwa-50/50" />
            ))}
          </div>
        )}

        {!isLoading && users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-khatulistiwa-600/70 text-sm">Tidak ada pengguna ditemukan.</p>
          </div>
        )}

        {!isLoading && users.length > 0 && (
          <div className="divide-y divide-khatulistiwa-100">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-[1.6fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center">
                {/* Pengguna + jabatan/direktorat/kedeputian */}
                <div className="min-w-0">
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
                </div>

                {/* Peran */}
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-khatulistiwa-300">Pengguna terdaftar</span>
                  ) : (
                    u.roles.map((r) => (
                      <span
                        key={r}
                        className={cn(
                          "text-[11px] font-semibold border px-2 py-0.5 rounded-full",
                          ROLE_CHIP[r] ?? "bg-khatulistiwa-50 text-khatulistiwa-700 border-khatulistiwa-100",
                        )}
                      >
                        {roleLabel(r)}
                      </span>
                    ))
                  )}
                </div>

                {/* Login terakhir */}
                <div className="text-xs text-khatulistiwa-600/70 inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-khatulistiwa-400/60" aria-hidden="true" />
                  {lastSeenLabel(u.last_seen)}
                </div>

                {/* Status */}
                <div>
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
                </div>

                <button
                  onClick={() => setActiveUser(u)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-khatulistiwa-600 hover:text-khatulistiwa-800 transition-colors whitespace-nowrap"
                >
                  <ShieldPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Kelola Peran
                </button>
              </div>
            ))}
          </div>
        )}
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

              {/* Superadmin — locked, cannot be changed here */}
              {activeIsSuperadmin && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-terakota-300/50 bg-terakota-50 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-khatulistiwa-900">Superadmin</p>
                    <p className="text-xs text-khatulistiwa-600/70">Akses penuh — tidak dapat diubah di sini.</p>
                  </div>
                  <Lock className="w-4 h-4 text-terakota-600 shrink-0" aria-hidden="true" />
                </div>
              )}

              {assignableRoles.map((role) => {
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
              {assignableRoles.length === 0 && (
                <p className="text-xs text-khatulistiwa-400">Belum ada peran yang dapat ditetapkan.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
