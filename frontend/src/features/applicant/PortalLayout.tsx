import { Outlet, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, FileText, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import SharedSidebar from "@/components/SharedSidebar";
import type { NavItem } from "@/components/SharedSidebar";
import { cn } from "@/lib/cn";

const BASE_NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/layanan", label: "Ajukan Izin", icon: FileText, exact: false },
  { to: "/portal/notifications", label: "Notifikasi", icon: Bell, exact: false },
];

const PAGE_TITLES: Record<string, string> = {
  "/portal": "Dashboard",
  "/portal/notifications": "Notifikasi",
  "/layanan": "Katalog Izin",
};

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

  const pageTitle =
    Object.entries(PAGE_TITLES)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => location.pathname.startsWith(path))?.[1] ?? "Portal";

  const sidebarWidth = collapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div className="min-h-screen flex" style={{ background: "#F0F4FA" }}>
      <SharedSidebar
        portalLabel="Portal Pemohon"
        nav={nav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main area ── */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300", sidebarWidth)}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-khatulistiwa-100/60 h-14
                           flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-ghost lg:hidden p-1.5"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-khatulistiwa-600/70 truncate">{pageTitle}</p>
          </div>

          <Link
            to="/portal/notifications"
            aria-label={unreadCount ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
            className="relative btn-ghost p-2"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {!!unreadCount && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 h-4 w-4 rounded-full bg-saka text-white text-[10px]
                           font-bold flex items-center justify-center leading-none"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main id="main-content" className="flex-1 p-5 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
