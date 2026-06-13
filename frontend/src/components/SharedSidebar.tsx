import { Link, useLocation } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type React from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

type PortalVariant = "pemohon" | "verifier" | "admin";

const VARIANT_STYLES: Record<PortalVariant, { strip: string; logoRing: string; logoBg: string }> = {
  pemohon: {
    strip: "bg-khatulistiwa-500",
    logoBg: "bg-khatulistiwa-600",
    logoRing: "ring-khatulistiwa-500/30",
  },
  verifier: {
    strip: "bg-emerald-500",
    logoBg: "bg-emerald-600",
    logoRing: "ring-emerald-500/30",
  },
  admin: {
    strip: "bg-amber-500",
    logoBg: "bg-amber-600",
    logoRing: "ring-amber-500/30",
  },
};

interface SharedSidebarProps {
  portalLabel: string;
  variant?: PortalVariant;
  roleBadge?: { icon: React.ElementType; label: string };
  nav: NavItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function SharedSidebar({
  portalLabel,
  variant = "pemohon",
  roleBadge,
  nav,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SharedSidebarProps) {
  const vStyle = VARIANT_STYLES[variant];
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const initials =
    user?.full_name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  // On desktop: width collapses. On mobile: always full width, controlled by translate.
  const sidebarWidth = collapsed ? "lg:w-16" : "lg:w-64";

  return (
    <>
      <aside
        aria-label={`Navigasi ${portalLabel}`}
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col",
          sidebarWidth,
          "transform transition-all duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "linear-gradient(180deg, #04182A 0%, #0A2540 100%)" }}
      >
        {/* ── Portal accent strip ── */}
        <div className={cn("h-0.5 w-full shrink-0", vStyle.strip)} aria-hidden="true" />

        {/* ── Logo ── */}
        <div
          className={cn(
            "px-3 py-5 border-b border-white/[0.08] flex items-center",
            collapsed ? "lg:justify-center" : "justify-between"
          )}
        >
          <Link to="/" className="flex items-center gap-3 min-w-0" aria-label="Lantara beranda">
            <div className={cn("w-9 h-9 rounded-xl ring-1 flex items-center justify-center shrink-0", vStyle.logoBg, vStyle.logoRing)}>
              <Building2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            {/* Mobile: always show text. Desktop: hide when collapsed. */}
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="text-white font-display font-bold text-base block leading-tight">Lantara</span>
              <p className="text-khatulistiwa-300/50 text-xs leading-none mt-0.5">{portalLabel}</p>
            </div>
          </Link>
          <button
            onClick={onMobileClose}
            className="lg:hidden text-khatulistiwa-300/60 hover:text-white p-1 ml-2"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* ── Role badge ── */}
        {roleBadge && (
          <div
            className={cn(
              "mx-3 mt-3 mb-1 flex items-center gap-2 rounded-lg px-3 py-2 bg-white/[0.05]",
              collapsed && "lg:justify-center lg:px-2"
            )}
          >
            <roleBadge.icon
              className="h-3.5 w-3.5 shrink-0 text-khatulistiwa-400"
              aria-hidden="true"
            />
            <span className={cn("text-xs font-medium text-white/55", collapsed && "lg:hidden")}>
              {roleBadge.label}
            </span>
          </div>
        )}

        {/* ── Nav items ── */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Menu utama">
          {nav.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed && "lg:justify-center lg:px-0",
                  active
                    ? "bg-khatulistiwa-600/25 text-white border border-khatulistiwa-500/30"
                    : "text-khatulistiwa-300/60 hover:bg-white/[0.05] hover:text-khatulistiwa-200"
                )}
              >
                <Icon
                  className={cn("w-5 h-5 shrink-0", active ? "text-terakota-400" : "")}
                  aria-hidden="true"
                />
                <span className={cn("flex-1", collapsed && "lg:hidden")}>{label}</span>
                {/* Active dot indicator (no badge) */}
                {active && !badge && (
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full bg-terakota-400 shrink-0", collapsed && "lg:hidden")}
                    aria-hidden="true"
                  />
                )}
                {!!badge && (
                  <span
                    className={cn(
                      "text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                      collapsed && "lg:hidden"
                    )}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Collapse toggle (desktop only) ── */}
        <div className="hidden lg:flex justify-end px-3 pb-1">
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Perlebar sidebar" : "Perkecil sidebar"}
            className="p-1.5 rounded-lg text-khatulistiwa-300/40 hover:text-khatulistiwa-200 hover:bg-white/[0.06] transition-all"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ── User card + logout ── */}
        <div className="px-3 py-4 border-t border-white/[0.08] space-y-1">
          {/* Expanded user card */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04]",
              collapsed && "lg:hidden"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-khatulistiwa-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name ?? "Pengguna"}</p>
              <p className="text-khatulistiwa-300/40 text-xs truncate">{user?.email}</p>
            </div>
          </div>

          {/* Collapsed: avatar only (desktop) */}
          <div
            className={cn(
              "hidden items-center justify-center py-1",
              collapsed && "lg:flex"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-khatulistiwa-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>

          <button
            onClick={logout}
            aria-label="Keluar dari akun"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-khatulistiwa-300/50 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span className={cn(collapsed && "lg:hidden")}>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      )}
    </>
  );
}
