import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";

export default function VerifierLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Slim sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="font-display font-bold text-lg text-jagawana">
            Lantara
          </Link>
          <p className="text-xs text-buana mt-0.5">Workspace Verifikator</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            to="/verifier"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === "/verifier"
                ? "bg-khatulistiwa/10 text-khatulistiwa"
                : "text-buana-dark hover:bg-muted"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Antrean
          </Link>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-buana">Verifikator</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-buana hover:text-saka px-3 py-1.5 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6">
        <Outlet />
      </main>
    </div>
  );
}
