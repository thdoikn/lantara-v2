import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Menu, X, LayoutDashboard, ShieldCheck, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

const NAV_LINKS = [
  { to: "/layanan", label: "Katalog Izin" },
  { to: "/rdtr", label: "Peta RDTR" },
  { to: "/validate", label: "Validasi Dokumen" },
];

const LINK_CLS =
  "relative px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white transition-colors " +
  "after:absolute after:left-3.5 after:right-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full " +
  "after:bg-gold-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left";

function PortalLinks({ roles }: { roles: string[] }) {
  const isSuperadmin = roles.includes("superadmin");
  const isVerifier = roles.some((r) => r.includes(":"));

  return (
    <div className="flex items-center gap-1.5">
      <Link
        to="/portal"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/85
                   hover:text-white hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all"
      >
        <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
        Portal Pemohon
      </Link>
      {(isSuperadmin || isVerifier) && (
        <Link
          to="/verifier"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/85
                     hover:text-white hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Verifikator
        </Link>
      )}
      {isSuperadmin && (
        <Link
          to="/admin"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/85
                     hover:text-white hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          Admin
        </Link>
      )}
    </div>
  );
}

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const roles = user?.roles ?? [];

  const initials =
    user?.full_name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  const roleLabel = roles.includes("superadmin")
    ? "Superadmin"
    : roles.some((r) => r.includes(":"))
    ? "Verifikator"
    : "Pemohon";

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
          <div className="relative h-9 w-9 rounded-xl bg-royal-600 flex items-center justify-center shadow-[0_0_20px_rgba(30,64,175,0.4)]">
            <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold-500 ring-2 ring-royal-950" aria-hidden="true" />
          </div>
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

        {/* Right: Portal links or auth buttons */}
        <div className="hidden md:flex items-center gap-2 justify-end">
          {isAuthenticated ? (
            <>
              <PortalLinks roles={roles} />
              <div className="flex items-center gap-2 pl-2 ml-0.5 border-l border-white/[0.15]">
                <div className="h-7 w-7 rounded-full bg-royal-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  {initials}
                </div>
                <p className="text-white/60 text-xs leading-tight hidden lg:block">{roleLabel}</p>
              </div>
            </>
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
                  {[
                    { to: "/portal", label: "Portal Pemohon", icon: LayoutDashboard, show: true },
                    {
                      to: "/verifier",
                      label: "Workspace Verifikator",
                      icon: ShieldCheck,
                      show: roles.includes("superadmin") || roles.some((r) => r.includes(":")),
                    },
                    { to: "/admin", label: "Admin Panel", icon: Settings, show: roles.includes("superadmin") },
                  ]
                    .filter((l) => l.show)
                    .map(({ to, label, icon: Icon }) => (
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
