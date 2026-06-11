import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Settings, FileText, Users } from "lucide-react";
import api from "@/lib/api";

interface Sektor {
  key: string;
  name: string;
  permit_count: number;
}

export default function AdminDashboard() {
  const { data: sektors } = useQuery<{ results: Sektor[] }>({
    queryKey: ["admin-sektors"],
    queryFn: () => api.get("/admin/engine/sektors/").then((r) => r.data),
  });

  const totalIzin = sektors?.results.reduce((sum, s) => sum + s.permit_count, 0) ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-buana text-sm mt-1">Manajemen engine perizinan Otorita IKN.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Settings className="w-5 h-5 text-primary" />} label="Total Sektor" value={sektors?.results.length ?? 0} />
        <StatCard icon={<FileText className="w-5 h-5 text-khatulistiwa" />} label="Total Izin" value={totalIzin} />
        <StatCard icon={<Users className="w-5 h-5 text-terakota" />} label="Versi Engine" value="v2.0" />
      </div>

      {/* Sektor cards */}
      <div>
        <h2 className="font-semibold text-sm mb-3">Sektor Aktif</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sektors?.results.map((s) => (
            <Link
              key={s.key}
              to={`/admin/engine/${s.key}`}
              className="block rounded-xl border border-border p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <p className="font-semibold text-sm">{s.name}</p>
              <p className="text-xs text-buana mt-1">{s.permit_count} jenis izin</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Engine builder link */}
      <Link
        to="/admin/engine"
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-jagawana-deep transition-colors"
      >
        <Settings className="w-4 h-4" />
        Buka Engine Builder
      </Link>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-buana">{label}</p>
      </div>
    </div>
  );
}
