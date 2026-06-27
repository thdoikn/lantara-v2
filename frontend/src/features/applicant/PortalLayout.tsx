import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, Map, FilePlus2 } from "lucide-react";
import api from "@/lib/api";
import { useNotificationSocket } from "@/lib/useNotificationSocket";
import PortalShell from "@/components/PortalShell";
import type { NavItem } from "@/components/SharedSidebar";
import type { QuickAction } from "@/components/PortalShell";

const BASE_NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/layanan", label: "Katalog Izin", icon: Map, exact: false },
  { to: "/portal/notifications", label: "Notifikasi", icon: Bell, exact: false },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new", label: "Ajukan Izin Baru", icon: FilePlus2, to: "/layanan", keywords: "baru permohonan ajukan buat" },
  { id: "catalog", label: "Lihat Katalog Layanan", icon: Map, to: "/layanan", keywords: "katalog izin layanan" },
];

export default function PortalLayout() {
  // Live push (with the 30s poll below as a fallback when the socket is down).
  useNotificationSocket();

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/notifications/unread-count/").then((r) => r.data.count as number),
    refetchInterval: 30_000,
  });

  const nav: NavItem[] = BASE_NAV.map((item) =>
    item.to === "/portal/notifications" ? { ...item, badge: unreadCount ?? 0 } : item,
  );

  return (
    <PortalShell
      portalLabel="Portal Pemohon"
      variant="pemohon"
      nav={nav}
      quickActions={QUICK_ACTIONS}
      notifications={{ to: "/portal/notifications", count: unreadCount ?? 0 }}
    />
  );
}
