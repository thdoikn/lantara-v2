import { Settings, LayoutGrid, Users, BarChart3, Cpu, Building2 } from "lucide-react";
import PortalShell from "@/components/PortalShell";
import type { NavItem } from "@/components/SharedSidebar";
import type { QuickAction } from "@/components/PortalShell";

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/admin/engine", label: "Engine Builder", icon: Settings },
  { to: "/admin/users", label: "Pengguna & RBAC", icon: Users },
  { to: "/admin/tenants", label: "Tenant MPP", icon: Building2 },
  { to: "/admin/analytics", label: "Analitik", icon: BarChart3 },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: "engine", label: "Buka Engine Builder", icon: Settings, to: "/admin/engine", keywords: "izin stage form sektor" },
  { id: "users", label: "Kelola Pengguna & RBAC", icon: Users, to: "/admin/users", keywords: "peran role akses" },
  { id: "analytics", label: "Lihat Analitik", icon: BarChart3, to: "/admin/analytics", keywords: "metrik laporan grafik" },
];

export default function AdminLayout() {
  return (
    <PortalShell
      portalLabel="Admin Panel"
      variant="admin"
      roleBadge={{ icon: Cpu, label: "Engine v2.0" }}
      nav={NAV}
      quickActions={QUICK_ACTIONS}
    />
  );
}
