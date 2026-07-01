import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, LayoutDashboard, ShieldCheck, Settings, ChevronDown, LogOut,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuthStore } from "@/lib/auth";
import { getPortals, getRoleLabel } from "@/lib/access";
import type { User } from "@/types";

const NAV_LINKS = [
  { to: "/layanan", label: "Katalog Izin" },
  { to: "/rdtr", label: "Peta RDTR" },
  { to: "/validate", label: "Validasi Dokumen" },
];

const LINK_CLS =
  "relative px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white transition-colors " +
  "after:absolute after:left-3.5 after:right-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full " +
  "after:bg-gold-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left";

function initialsOf(user: User | null) {
  return (
    user?.full_name
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?"
  );
}

// Portals the user may enter — single source for both the dropdown and mobile menu.
function portalItems(user: User | null) {
  const portals = getPortals(user);
  return [
    { to: "/portal", label: "Portal Pemohon", desc: "Permohonan izin Anda", icon: LayoutDashboard, show: true },
    { to: "/verifier", label: "Workspace Verifikator", desc: "Verifikasi sesuai penugasan", icon: ShieldCheck, show: portals.verifier },
    { to: "/admin", label: "Panel Admin", desc: "Engine, pengguna & analitik", icon: Settings, show: portals.admin },
    { to: "/tenant", label: "Portal Tenant", desc: "Kelola loket & antrean tenant", icon: Settings, show: portals.tenant },
    { to: "/loket", label: "Portal Loket", desc: "Layani antrean di loket", icon: LayoutDashboard, show: portals.loket },
  ].filter((i) => i.show);
}

// ── Profile dropdown (desktop) ──────────────────────────────────────────────────

function ProfileMenu({ user }: { user: User | null }) {
  const logout = useAuthStore((s) => s.logout);
  const items = portalItems(user);
  const firstName = user?.full_name?.split(" ")[0] ?? "Akun";

  const itemCls =
    "flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer outline-none " +
    "text-white/80 data-[highlighted]:bg-white/10 data-[highlighted]:text-white transition-colors";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-white/15
                     hover:border-white/30 hover:bg-white/10 transition-all outline-none
                     data-[state=open]:bg-white/10 data-[state=open]:border-white/30"
          aria-label="Menu akun"
        >
          <div className="h-7 w-7 rounded-full bg-royal-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {initialsOf(user)}
          </div>
          <span className="hidden lg:block text-white/80 text-xs font-semibold max-w-[7rem] truncate">{firstName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/50 transition-transform" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[60] w-72 rounded-2xl border border-white/10 bg-royal-950/95 backdrop-blur-md
                     shadow-2xl p-1.5 data-[state=open]:animate-fade-in"
        >
          {/* User header */}
          <div className="px-3 py-2.5">
            <p className="text-white text-sm font-semibold truncate">{user?.full_name ?? "Pengguna"}</p>
            {user?.email && <p className="text-white/45 text-xs truncate mt-0.5">{user.email}</p>}
            <span className="inline-flex mt-2 items-center text-[10px] font-bold uppercase tracking-wider text-gold-500 bg-gold-500/10 border border-gold-500/25 px-2 py-0.5 rounded-full">
              {getRoleLabel(user)}
            </span>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-white/10" />

          <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-[0.14em] text-white/35 font-bold">
            Portal Anda
          </p>
          {items.map(({ to, label, desc, icon: Icon }) => (
            <DropdownMenu.Item key={to} asChild>
              <Link to={to} className={itemCls}>
                <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-white/80" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{label}</span>
                  <span className="block text-xs text-white/45 leading-tight mt-0.5">{desc}</span>
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-white/10" />

          <DropdownMenu.Item
            onSelect={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none
                       text-red-300 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-200 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">Keluar</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-royal-950/95 backdrop-blur-md border-b border-white/10 shadow-lg"
          : "bg-royal-950/80 backdrop-blur-sm border-b border-white/[0.06]"
      }`}
    >
      {/* Grid layout for perfect center alignment */}
      <nav className="max-w-6xl mx-auto px-4 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2.5" aria-label="Lantara beranda">
          <img src="/ikn-logo.png" alt="IKN" className="h-9 w-9 rounded-xl object-contain" />
          <span className="font-display font-extrabold text-white text-lg tracking-tight">Lantara</span>
        </Link>

        {/* Center: Nav links — perfectly centered */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={LINK_CLS}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right: profile dropdown or auth buttons */}
        <div className="hidden md:flex items-center gap-2 justify-end">
          {isAuthenticated ? (
            <ProfileMenu user={user} />
          ) : (
            <>
              <Link
                to="/auth/login"
                className="px-4 py-2 text-sm font-semibold text-white/85 rounded-xl border border-white/20 hover:bg-white/10 hover:border-white/35 transition-all"
              >
                Masuk
              </Link>
              <Link
                to="/auth/register"
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-royal-600 hover:bg-royal-500 shadow-[0_0_20px_rgba(30,64,175,0.35)] transition-all"
              >
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex justify-end">
          <button
            className="p-2 text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-royal-950/98 backdrop-blur-md border-b border-white/10"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <div className="pt-3 mt-2 border-t border-white/10 space-y-1">
                  {/* Account header */}
                  <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="h-9 w-9 rounded-full bg-royal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initialsOf(user)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{user?.full_name ?? "Pengguna"}</p>
                      <p className="text-white/45 text-xs truncate">{getRoleLabel(user)}</p>
                    </div>
                  </div>
                  {portalItems(user).map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={() => { setMobileOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/15 transition-colors"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-3 mt-2 border-t border-white/10">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl border border-white/20"
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-royal-600"
                  >
                    Daftar
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
