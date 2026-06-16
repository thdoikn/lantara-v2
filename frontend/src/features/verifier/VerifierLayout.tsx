import { Outlet } from "react-router-dom";
import { LayoutDashboard, ShieldCheck, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/verifier", label: "Antrean", icon: LayoutDashboard, exact: true },
];

export default function VerifierLayout() {
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
    <div className="min-h-screen flex" style={{ background: "#F5F4EF" }}>
      <SharedSidebar
        portalLabel="Workspace"
        variant="verifier"
        roleBadge={{ icon: ShieldCheck, label: "Verifikator" }}
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
        <main id="main-content" className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
