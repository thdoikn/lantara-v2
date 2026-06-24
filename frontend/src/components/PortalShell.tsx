import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Menu, Search, Bell, ChevronRight, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SharedSidebar from "@/components/SharedSidebar";
import type { NavItem } from "@/components/SharedSidebar";
import CommandPalette from "@/components/CommandPalette";
import type { Command } from "@/components/CommandPalette";
import Kbd from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";

export interface QuickAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  to: string;
  keywords?: string;
}

/**
 * Shared authenticated shell: sidebar + a real top bar (breadcrumbs, ⌘K search,
 * notifications) + the global command palette. The three portal layouts collapse
 * into thin wrappers over this, so they stay coherent while differing only in
 * variant, nav, and quick actions.
 */
export default function PortalShell({
  portalLabel,
  variant,
  roleBadge,
  nav,
  quickActions = [],
  notifications,
}: {
  portalLabel: string;
  variant: "pemohon" | "verifier" | "admin";
  roleBadge?: { icon: LucideIcon; label: string };
  nav: NavItem[];
  quickActions?: QuickAction[];
  notifications?: { to: string; count?: number };
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar_collapsed", String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  // Breadcrumb from nav match + portal root.
  const crumbs = useMemo(() => {
    const path = location.pathname;
    const match = [...nav]
      .filter((n) => path === n.to || path.startsWith(n.to + "/"))
      .sort((a, b) => b.to.length - a.to.length)[0];
    const list: { label: string; to?: string }[] = [{ label: portalLabel, to: nav[0]?.to }];
    if (match && match.label !== list[0].label) list.push({ label: match.label });
    return list;
  }, [location.pathname, nav, portalLabel]);

  const commands: Command[] = useMemo(() => {
    const navCmds: Command[] = nav.map((n) => ({
      id: `nav:${n.to}`,
      label: n.label,
      group: "Navigasi",
      icon: n.icon,
      perform: () => navigate(n.to),
    }));
    const actionCmds: Command[] = quickActions.map((a) => ({
      id: `action:${a.id}`,
      label: a.label,
      group: "Tindakan",
      icon: a.icon,
      keywords: a.keywords,
      perform: () => navigate(a.to),
    }));
    return [...actionCmds, ...navCmds];
  }, [nav, quickActions, navigate]);

  const sidebarWidth = collapsed ? "lg:pl-16" : "lg:pl-64";
  const accentBar = variant === "verifier" ? "bg-emerald-500" : variant === "admin" ? "bg-amber-500" : "bg-khatulistiwa-500";

  return (
    <div className="min-h-screen flex bg-pertiwi-warm">
      <SharedSidebar
        portalLabel={portalLabel}
        variant={variant}
        roleBadge={roleBadge}
        nav={nav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300", sidebarWidth)}>
        {/* Top bar */}
        <div className="sticky top-0 z-30">
        <div className={cn("h-0.5 w-full", accentBar)} aria-hidden="true" />
        <header className="flex items-center gap-3 h-16 px-4 sm:px-6 lg:px-8
                           bg-pertiwi-warm/85 backdrop-blur-md border-b border-pertiwi-muted">
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-1 text-khatulistiwa-700 hover:bg-khatulistiwa-100 rounded-lg transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
            <Home className="w-3.5 h-3.5 text-khatulistiwa-400 shrink-0" aria-hidden="true" />
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-khatulistiwa-300 shrink-0" aria-hidden="true" />}
                {c.to && i < crumbs.length - 1 ? (
                  <Link to={c.to} className="text-sm text-khatulistiwa-500 hover:text-khatulistiwa-800 transition-colors truncate">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-khatulistiwa-900 truncate">{c.label}</span>
                )}
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Search trigger */}
          <button
            onClick={() => window.dispatchEvent(new Event("lantara:open-command"))}
            className="hidden sm:flex items-center gap-2 h-9 pl-3 pr-2 rounded-xl border border-pertiwi-muted bg-white
                       text-khatulistiwa-400 hover:border-khatulistiwa-300 transition-colors"
            aria-label="Cari (Ctrl+K)"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Cari…</span>
            <span className="flex items-center gap-0.5 ml-2"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event("lantara:open-command"))}
            className="sm:hidden p-2 text-khatulistiwa-600 hover:bg-khatulistiwa-100 rounded-lg transition-colors"
            aria-label="Cari"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Notifications */}
          {notifications && (
            <Link
              to={notifications.to}
              className="relative p-2 text-khatulistiwa-600 hover:bg-khatulistiwa-100 rounded-lg transition-colors"
              aria-label={`Notifikasi${notifications.count ? ` (${notifications.count} belum dibaca)` : ""}`}
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {!!notifications.count && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-terakota-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {notifications.count > 9 ? "9+" : notifications.count}
                </span>
              )}
            </Link>
          )}
        </header>
        </div>

        <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette commands={commands} />
    </div>
  );
}
