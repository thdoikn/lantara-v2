import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { isMppSupervisor } from "@/lib/access";

export default function MppLayout() {
  const user = useAuthStore((s) => s.user);
  const supervisor = isMppSupervisor(user);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-royal-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-display text-lg font-bold text-ink">Antrean MPP</p>
            <p className="text-xs text-ink-faint">Mal Pelayanan Publik — IKN</p>
          </div>
          <nav className="flex gap-1 text-sm font-medium">
            <Tab to="/mpp" end label="Loket Saya" />
            {supervisor && <Tab to="/mpp/monitor" label="Monitor" />}
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
          isActive ? "bg-royal-600 text-white" : "text-ink-muted hover:bg-royal-50"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
