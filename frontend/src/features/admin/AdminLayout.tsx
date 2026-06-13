import { Outlet } from "react-router-dom";
import { Settings, LayoutGrid, Users, BarChart3, Cpu, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/admin/engine", label: "Engine Builder", icon: Settings },
  { to: "/admin/users", label: "Pengguna & RBAC", icon: Users },
  { to: "/admin/analytics", label: "Analitik", icon: BarChart3 },
];

export default function AdminLayout() {
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

  const sidebarWidth = collapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFF" }}>
      <SharedSidebar
        portalLabel="Admin Panel"
        variant="admin"
        roleBadge={{ icon: Cpu, label: "Engine v2.0" }}
        nav={NAV}
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
        <main id="main-content" className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
