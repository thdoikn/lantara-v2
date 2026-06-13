import { Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, ShieldCheck, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/verifier", label: "Antrean", icon: LayoutDashboard, exact: true },
];

const PAGE_TITLES: Record<string, string> = {
  "/verifier": "Antrean Verifikasi",
};

export default function VerifierLayout() {
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

  const pageTitle =
    Object.entries(PAGE_TITLES)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => location.pathname.startsWith(path))?.[1] ?? "Workspace";

  const sidebarWidth = collapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div className="min-h-screen flex bg-surface">
      <SharedSidebar
        portalLabel="Workspace"
        roleBadge={{ icon: ShieldCheck, label: "Verifikator" }}
        nav={NAV}
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-khatulistiwa-600/70 truncate">{pageTitle}</p>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
