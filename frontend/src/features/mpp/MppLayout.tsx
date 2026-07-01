import { Outlet } from "react-router-dom";
import { LayoutGrid, ScanLine, BarChart3 } from "lucide-react";
import PortalShell from "@/components/PortalShell";
import type { NavItem } from "@/components/SharedSidebar";

const NAV: NavItem[] = [
  { to: "/loket", label: "Loket Saya", icon: LayoutGrid, exact: true },
  { to: "/loket/checkin", label: "Check-in", icon: ScanLine },
  { to: "/loket/analitik", label: "Analitik", icon: BarChart3 },
];

/** Loket Portal shell — counter operators call and serve the queue. */
export default function MppLayout() {
  return (
    <PortalShell
      portalLabel="Portal Loket"
      variant="loket"
      roleBadge={{ icon: LayoutGrid, label: "Petugas Loket" }}
      nav={NAV}
    >
      <div className="mx-auto max-w-6xl">
        <Outlet />
      </div>
    </PortalShell>
  );
}
