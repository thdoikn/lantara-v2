import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, FileText, LogOut, Menu, X, Building2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/layanan", label: "Ajukan Izin", icon: FileText, exact: false },
];

export default function PortalLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/notifications/unread-count/").then((r) => r.data.count as number),
    refetchInterval: 30_000,
  });

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const initials = user?.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex" style={{ background: "#F0F4FA" }}>
      {/* ── Sidebar ── */}
      <aside
        aria-label="Navigasi portal"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "linear-gradient(180deg, #04182A 0%, #0A2540 100%)" }}
      >
        {/* Logo area */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-khatulistiwa-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <span className="text-white font-display font-bold text-base">Lantara</span>
              <p className="text-khatulistiwa-300/50 text-xs leading-none mt-0.5">Portal Pemohon</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-khatulistiwa-300/60 hover:text-white p-1"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Menu utama">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-khatulistiwa-600/25 text-white border border-khatulistiwa-500/30"
                    : "text-khatulistiwa-300/60 hover:bg-white/[0.05] hover:text-khatulistiwa-200"
                )}
              >
                <Icon
                  className={cn("w-5 h-5 shrink-0", active ? "text-terakota-400" : "")}
                  aria-hidden="true"
                />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] mb-2">
            <div className="w-8 h-8 rounded-full bg-khatulistiwa-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name ?? "Pemohon"}</p>
              <p className="text-khatulistiwa-300/40 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            aria-label="Keluar dari akun"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-khatulistiwa-300/50 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
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
            <p className="text-sm font-medium text-khatulistiwa-600/70 truncate">
              {NAV.find(({ to, exact }) => isActive(to, exact))?.label ?? "Portal"}
            </p>
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

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
