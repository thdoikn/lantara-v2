import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

/** Loket Portal shell — counter operators call and serve the queue. */
export default function MppLayout() {
  return (
    <div className="min-h-screen bg-pertiwi-warm">
      <header className="border-b border-pertiwi-muted bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-khatulistiwa-800">
              <LayoutGrid className="h-5 w-5 text-terakota-400" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-khatulistiwa-900">Portal Loket</p>
              <p className="text-xs text-khatulistiwa-400">Mal Pelayanan Publik — IKN</p>
            </div>
          </div>
          <nav className="flex gap-1 text-sm font-medium">
            <Tab to="/loket" end label="Loket Saya" />
            <Tab to="/loket/checkin" label="Check-in" />
            <Tab to="/loket/analitik" label="Analitik" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function Tab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 ${
          isActive ? "bg-khatulistiwa-600 text-white" : "text-khatulistiwa-600 hover:bg-khatulistiwa-50"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
