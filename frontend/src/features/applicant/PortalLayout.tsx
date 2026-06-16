import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, Map, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import SharedSidebar from "@/components/SharedSidebar";
import type { NavItem } from "@/components/SharedSidebar";
import { cn } from "@/lib/cn";

const BASE_NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/layanan", label: "Katalog Izin", icon: Map, exact: false },
  { to: "/portal/notifications", label: "Notifikasi", icon: Bell, exact: false },
];

export default function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/notifications/unread-count/").then((r) => r.data.count as number),
    refetchInterval: 30_000,
  });

  const nav: NavItem[] = BASE_NAV.map((item) =>
    item.to === "/portal/notifications"
      ? { ...item, badge: unreadCount ?? 0 }
      : item
  );

  const sidebarWidth = collapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F4EF" }}>
      <SharedSidebar
        portalLabel="Portal Pemohon"
        variant="pemohon"
        nav={nav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2.5 bg-ink/80 backdrop-blur-sm rounded-xl text-white shadow-lg"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Main area */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300", sidebarWidth)}>
        <main id="main-content" className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
