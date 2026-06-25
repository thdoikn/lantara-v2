import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Search, ShieldCheck, ShieldPlus, X, Mail, BadgeCheck, CircleSlash } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import type { PaginatedResponse } from "@/types";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  nik: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  roles: string[];
}

interface Role {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
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

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto space-y-6">
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
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-khatulistiwa-100 text-[11px] font-bold uppercase tracking-[0.08em] text-khatulistiwa-600/70">
          <span>Pengguna</span>
          <span>Peran</span>
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
              <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-khatulistiwa-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-khatulistiwa-600/70 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{u.email}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 max-w-[220px]">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-khatulistiwa-300">Tanpa peran</span>
                  ) : (
                    u.roles.map((r) => (
                      <span
                        key={r}
                        className="text-[11px] font-semibold bg-khatulistiwa-50 text-khatulistiwa-700 border border-khatulistiwa-100 px-2 py-0.5 rounded-full"
                      >
                        {r}
                      </span>
                    ))
                  )}
                </div>

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
                  className="flex items-center gap-1.5 text-xs font-semibold text-khatulistiwa-600 hover:text-khatulistiwa-800 transition-colors"
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
              <div>
                <h2 className="font-display font-bold text-khatulistiwa-900">{activeUser.full_name}</h2>
                <p className="text-xs text-khatulistiwa-600/70 mt-0.5">{activeUser.email}</p>
                <p className="text-[11px] text-khatulistiwa-400/70 mt-1">
                  Bergabung {format(parseISO(activeUser.created_at), "d MMM yyyy", { locale: localeId })}
                </p>
              </div>
              <button
                onClick={() => setActiveUser(null)}
                className="text-khatulistiwa-400 hover:text-khatulistiwa-700 transition-colors"
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
              {roles.map((role) => {
                const isAssigned = activeUser.roles.includes(role.key);
                const pending = assignMutation.isPending || revokeMutation.isPending;
                return (
                  <label
                    key={role.key}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors",
                      isAssigned
                        ? "bg-khatulistiwa-50 border-khatulistiwa-200"
                        : "bg-white border-khatulistiwa-100 hover:border-khatulistiwa-200"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-khatulistiwa-900">{role.name}</p>
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
                            { onSuccess: () => setActiveUser((u) => u && { ...u, roles: u.roles.filter((r) => r !== role.key) }) }
                          );
                        } else {
                          assignMutation.mutate(
                            { userId: activeUser.id, roleKey: role.key },
                            { onSuccess: () => setActiveUser((u) => u && { ...u, roles: [...u.roles, role.key] }) }
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-khatulistiwa-300 text-khatulistiwa-600 focus:ring-khatulistiwa-400/30 flex-shrink-0"
                    />
                  </label>
                );
              })}
              {roles.length === 0 && (
                <p className="text-xs text-khatulistiwa-400">Belum ada peran terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
