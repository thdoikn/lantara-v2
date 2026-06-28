import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ListChecks, Bell, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { useNotificationSocket } from "@/lib/useNotificationSocket";
import PortalShell from "@/components/PortalShell";
import type { NavItem } from "@/components/SharedSidebar";

const BASE_NAV: NavItem[] = [
  { to: "/verifier", label: "Beranda", icon: LayoutDashboard, exact: true },
  { to: "/verifier/queue", label: "Antrean", icon: ListChecks, exact: false },
  { to: "/verifier/notifications", label: "Notifikasi", icon: Bell, exact: false },
];

export default function VerifierLayout() {
  // Live push so a verifier sees new queue items / SLA alerts without refreshing.
  useNotificationSocket();

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/notifications/unread-count/").then((r) => r.data.count as number),
    refetchInterval: 30_000,
  });

  const nav: NavItem[] = BASE_NAV.map((item) =>
    item.to === "/verifier/notifications" ? { ...item, badge: unreadCount ?? 0 } : item,
  );

  return (
    <PortalShell
      portalLabel="Workspace"
      variant="verifier"
      roleBadge={{ icon: ShieldCheck, label: "Verifikator" }}
      nav={nav}
      notifications={{ to: "/verifier/notifications", count: unreadCount ?? 0 }}
    />
  );
}
