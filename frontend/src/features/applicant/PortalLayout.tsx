import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, FileText, LogOut, Menu, X, Leaf, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ── */}
      <aside
        aria-label="Navigasi portal"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-300 ease-out",
          "bg-white ring-1 ring-black/[0.06] shadow-floating",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-jagawana flex items-center justify-center shadow-glow-green">
              <Leaf className="h-4.5 w-4.5 text-white" aria-hidden="true" />
            </div>
            <div>
              <span className="font-display font-bold text-base text-foreground tracking-tight">Lantara</span>
              <span className="block text-[10px] text-buana leading-none -mt-0.5">Portal Pemohon</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden btn-ghost p-1.5"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Menu utama">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn("nav-item", active && "nav-item-active")}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 pb-4 border-t border-border/60 pt-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/60 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-jagawana to-khatulistiwa
                            flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.full_name}</p>
              <p className="text-xs text-buana truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            aria-label="Keluar dari akun"
            className="nav-item w-full text-buana hover:text-saka hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border/60 h-14
                           flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-ghost lg:hidden p-1.5"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Breadcrumb hint */}
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-buana truncate">
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
