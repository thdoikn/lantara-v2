import { Outlet, useLocation } from "react-router-dom";
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

function getPageTitle(pathname: string): string {
  if (pathname === "/portal") return "Dashboard";
  if (pathname.startsWith("/portal/submissions/")) return "Detail Permohonan";
  if (pathname === "/portal/notifications") return "Notifikasi";
  if (pathname.startsWith("/portal/ajukan")) return "Ajukan Izin";
  return "Portal Pemohon";
}

export default function PortalLayout() {
  const location = useLocation();
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
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen flex" style={{ background: "#F0F4FA" }}>
      <SharedSidebar
        portalLabel="Portal Pemohon"
        variant="pemohon"
        nav={nav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile hamburger — floating, lg hidden */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2.5 bg-ink/80 backdrop-blur-sm rounded-xl text-white shadow-lg"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* ── Main area ── */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300", sidebarWidth)}>
        {/* Sticky top bar */}
        <div className="bg-white border-b border-khatulistiwa-100/60 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <h1 className="text-khatulistiwa-900 font-display font-bold text-lg">{pageTitle}</h1>
          <button
            className="relative p-2 rounded-xl hover:bg-khatulistiwa-50 transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5 text-khatulistiwa-400" aria-hidden="true" />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-terakota-500 rounded-full" aria-hidden="true" />
            )}
          </button>
        </div>

        <main id="main-content" className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
