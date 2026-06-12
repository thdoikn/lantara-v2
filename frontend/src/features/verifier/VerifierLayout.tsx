import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, LogOut, Leaf, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";

export default function VerifierLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const isVerifierRoot = location.pathname === "/verifier";

  const initials = user?.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex bg-surface">
      {/* ── Dark sidebar (signals staff workspace per CLAUDE.md §4) ── */}
      <aside
        aria-label="Navigasi verifikator"
        className="w-56 shrink-0 flex flex-col bg-sidebar ring-1 ring-sidebar-border"
        style={{ backgroundColor: "#060D2E" }}
      >
        {/* Brand */}
        <div className="px-4 h-14 flex items-center gap-2.5 border-b"
             style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="h-7 w-7 rounded-lg bg-jagawana flex items-center justify-center shrink-0">
            <Leaf className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-white tracking-tight">Lantara</span>
            <span className="block text-[10px] leading-none" style={{ color: "rgba(255,255,255,0.38)" }}>
              Workspace
            </span>
          </div>
        </div>

        {/* Staff badge */}
        <div className="mx-3 mt-3 mb-1 flex items-center gap-2 rounded-lg px-3 py-2"
             style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(37,99,235,0.95)" }} aria-hidden="true" />
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            Verifikator
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5" aria-label="Menu verifikator">
          <Link
            to="/verifier"
            aria-current={isVerifierRoot ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isVerifierRoot
                ? "text-white bg-white/12 font-semibold"
                : "hover:bg-white/8"
            )}
            style={{ color: isVerifierRoot ? "white" : "rgba(255,255,255,0.60)" }}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
            Antrean
            {isVerifierRoot && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-jagawana" aria-hidden="true" />
            )}
          </Link>
        </nav>

        {/* User */}
        <div className="p-3 space-y-1 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
               style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <div className="h-7 w-7 rounded-lg bg-khatulistiwa flex items-center justify-center
                            text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            aria-label="Keluar dari akun"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-full transition-all duration-150
                       hover:bg-red-500/15"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col">
        {/* Thin top bar */}
        <header className="h-10 flex items-center px-6 border-b bg-white/60 backdrop-blur-sm"
                style={{ borderColor: "#DBE3F4" }}>
          <span className="text-xs font-semibold text-buana uppercase tracking-widest">
            Antrean Verifikasi
          </span>
        </header>

        <main id="main-content" className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
