/**
 * Engine Builder — root page listing all sektors + izin counts.
 * Clicking a sektor drills into IzinListPage.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import api from "@/lib/api";

interface Sektor {
  id: string;
  key: string;
  name: string;
  description: string;
  is_active: boolean;
  permit_count: number;
}

interface PermitTypeStub {
  id: string;
  key: string;
  name: string;
  sla_days: number;
  is_published: boolean;
}

export default function EngineBuilderPage() {
  const { data: sektors, isLoading } = useQuery<{ results: Sektor[] }>({
    queryKey: ["admin-engine-sektors"],
    queryFn: () => api.get("/admin/engine/sektors/").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Engine Builder</h1>
          <p className="text-buana text-sm mt-1">Kelola konfigurasi sektor, izin, alur kerja, dan formulir.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-jagawana-deep transition-colors">
          <Plus className="w-4 h-4" />
          Tambah Sektor
        </button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {sektors?.results.map((sektor) => (
          <SektorRow key={sektor.key} sektor={sektor} />
        ))}
      </div>
    </div>
  );
}

function SektorRow({ sektor }: { sektor: Sektor }) {
  const { data: izinList } = useQuery<{ results: PermitTypeStub[] }>({
    queryKey: ["admin-izin-list", sektor.key],
    queryFn: () => api.get(`/admin/engine/permit-types/?sektor__key=${sektor.key}`).then((r) => r.data),
  });

  const published = izinList?.results.filter((p) => p.is_published).length ?? 0;
  const total = izinList?.results.length ?? 0;

  return (
    <Link
      to={`/admin/engine/${sektor.key}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors group"
    >
      <div>
        <p className="font-semibold text-sm">{sektor.name}</p>
        <p className="text-xs text-buana mt-0.5">
          {published}/{total} izin diterbitkan
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            sektor.is_active ? "bg-jagawana/10 text-jagawana" : "bg-muted text-buana"
          }`}
        >
          {sektor.is_active ? "Aktif" : "Nonaktif"}
        </span>
        <ChevronRight className="w-4 h-4 text-buana group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}
