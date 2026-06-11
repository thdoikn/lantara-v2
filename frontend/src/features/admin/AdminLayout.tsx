import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Settings, LayoutGrid, Users, BarChart3, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/admin/engine", label: "Engine Builder", icon: Settings },
  { to: "/admin/users", label: "Pengguna & RBAC", icon: Users },
  { to: "/admin/analytics", label: "Analitik", icon: BarChart3 },
];

export default function AdminLayout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/auth/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="font-display font-bold text-sm text-primary">Lantara v2</p>
          <p className="text-xs text-buana">Admin Panel</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-buana-dark hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <p className="text-xs text-buana truncate mb-2">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-buana hover:text-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
