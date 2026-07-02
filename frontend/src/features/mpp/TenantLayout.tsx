import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, LayoutGrid, DoorOpen, ListChecks, Clock, Users, BarChart3, Loader2 } from "lucide-react";
import PortalShell from "@/components/PortalShell";
import type { NavItem } from "@/components/SharedSidebar";
import { adminListInstansi } from "./api";
import type { TenantScope } from "./tenantScope";

const NAV: NavItem[] = [
  { to: "/tenant", label: "Monitor", icon: LayoutGrid, exact: true },
  { to: "/tenant/loket", label: "Loket", icon: DoorOpen },
  { to: "/tenant/layanan", label: "Layanan", icon: ListChecks },
  { to: "/tenant/jam", label: "Jam Operasional", icon: Clock },
  { to: "/tenant/petugas", label: "Petugas", icon: Users },
  { to: "/tenant/analitik", label: "Analitik", icon: BarChart3 },
];

export default function TenantLayout() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["antrean", "admin-instansi"],
    queryFn: adminListInstansi,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tenant = tenants?.find((t) => t.id === selectedId) ?? tenants?.[0] ?? null;

  const selector =
    tenants && tenants.length > 1 ? (
      <select
        value={tenant?.id ?? ""}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded-lg border border-pertiwi-muted bg-white px-3 py-1.5 text-sm font-medium text-khatulistiwa-800"
        aria-label="Pilih tenant"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <PortalShell
      portalLabel="Portal Tenant"
      variant="tenant"
      roleBadge={{ icon: Building2, label: "Admin Tenant" }}
      nav={NAV}
      topbar={selector}
    >
      {isLoading ? (
        <div className="flex items-center gap-3 text-khatulistiwa-500/70">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat tenant…
        </div>
      ) : !tenant ? (
        <p className="rounded-2xl border border-dashed border-pertiwi-muted bg-white p-8 text-center text-khatulistiwa-500/70">
          Anda belum ditugaskan mengelola tenant mana pun.
        </p>
      ) : (
        <div className="mx-auto max-w-6xl">
          <Outlet context={{ tenant, tenants: tenants ?? [] } satisfies TenantScope} />
        </div>
      )}
    </PortalShell>
  );
}
