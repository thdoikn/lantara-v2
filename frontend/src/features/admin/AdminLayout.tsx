import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Settings, LayoutGrid, Users, BarChart3, LogOut, Leaf, Cpu } from "lucide-react";
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

  const initials = user?.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFF" }}>
      {/* ── Dark admin sidebar ── */}
      <aside
        aria-label="Navigasi admin"
        className="w-56 shrink-0 flex flex-col"
        style={{ backgroundColor: "#03061A", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Brand */}
        <div className="px-4 h-14 flex items-center gap-2.5 border-b"
             style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="h-8 w-8 rounded-xl bg-gradient-jagawana flex items-center justify-center shrink-0">
            <Leaf className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-white tracking-tight">Lantara</span>
            <span className="block text-[10px] leading-none" style={{ color: "rgba(255,255,255,0.35)" }}>
              Admin Panel
            </span>
          </div>
        </div>

        {/* Engine badge */}
        <div className="mx-3 mt-3 mb-2 flex items-center gap-2 rounded-lg px-3 py-2"
             style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          <Cpu className="h-3.5 w-3.5" style={{ color: "rgba(212,160,23,0.95)" }} aria-hidden="true" />
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>
            Engine v2.0
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 space-y-0.5" aria-label="Menu admin">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "text-white bg-white/12 font-semibold"
                    : "hover:bg-white/8"
                )
              }
              style={({ isActive }) => ({
                color: isActive ? "white" : "rgba(255,255,255,0.55)",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-terakota" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 space-y-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
               style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <div className="h-7 w-7 rounded-lg bg-terakota/80 flex items-center justify-center
                            text-buana-dark text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                Superadmin
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Keluar dari akun"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-full transition-all duration-150
                       hover:bg-red-500/15"
            style={{ color: "rgba(255,255,255,0.42)" }}
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main id="main-content" className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
