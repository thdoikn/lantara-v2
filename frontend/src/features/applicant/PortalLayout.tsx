import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, FileText, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";
import { cn } from "@/lib/cn";

export default function PortalLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/notifications/unread-count/").then((r) => r.data.count as number),
    refetchInterval: 30_000,
  });

  const navItems = [
    { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/layanan", label: "Ajukan Izin", icon: FileText, exact: false },
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl text-jagawana">
            Lantara
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(to, exact)
                  ? "bg-jagawana/10 text-jagawana"
                  : "text-buana-dark hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-jagawana/20 flex items-center justify-center text-jagawana font-semibold text-sm">
              {user?.full_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-buana truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-buana hover:text-saka transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <Link to="/portal/notifications" className="relative p-2 rounded-lg hover:bg-muted">
            <Bell className="h-5 w-5" />
            {unreadCount ? (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-saka text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
