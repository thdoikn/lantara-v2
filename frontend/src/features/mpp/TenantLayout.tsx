import { useState } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { adminListInstansi, type Instansi } from "./api";

export interface TenantScope {
  tenant: Instansi;
  tenants: Instansi[];
}

export function useTenantScope() {
  return useOutletContext<TenantScope>();
}

const TABS = [
  { to: "/tenant", end: true, label: "Monitor" },
  { to: "/tenant/loket", label: "Loket" },
  { to: "/tenant/layanan", label: "Layanan" },
  { to: "/tenant/jam", label: "Jam Operasional" },
  { to: "/tenant/petugas", label: "Petugas" },
  { to: "/tenant/analitik", label: "Analitik" },
];

export default function TenantLayout() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["antrean", "admin-instansi"],
    queryFn: adminListInstansi,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tenant = tenants?.find((t) => t.id === selectedId) ?? tenants?.[0] ?? null;

  return (
    <div className="min-h-screen bg-pertiwi-warm">
      <header className="border-b border-pertiwi-muted bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-khatulistiwa-800">
              <Building2 className="h-5 w-5 text-terakota-400" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-khatulistiwa-900">Portal Tenant</p>
              <p className="text-xs text-khatulistiwa-400">Mal Pelayanan Publik — IKN</p>
            </div>
          </div>

          {tenants && tenants.length > 1 && (
            <select
              value={tenant?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-pertiwi-muted bg-white px-3 py-1.5 text-sm font-medium text-khatulistiwa-800"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <nav className="flex flex-wrap gap-1 text-sm font-medium">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 ${
                    isActive
                      ? "bg-khatulistiwa-600 text-white"
                      : "text-khatulistiwa-600 hover:bg-khatulistiwa-50"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {isLoading ? (
          <div className="flex items-center gap-3 text-khatulistiwa-500/70">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat tenant…
          </div>
        ) : !tenant ? (
          <p className="rounded-2xl border border-dashed border-pertiwi-muted bg-white p-8 text-center text-khatulistiwa-500/70">
            Anda belum ditugaskan mengelola tenant mana pun.
          </p>
        ) : (
          <Outlet context={{ tenant, tenants: tenants ?? [] } satisfies TenantScope} />
        )}
      </main>
    </div>
  );
}
