import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, FileText, Users, ArrowRight, TrendingUp, Layers } from "lucide-react";
import api from "@/lib/api";

interface Sektor {
  key: string;
  name: string;
  permit_count: number;
  is_active: boolean;
}

export default function AdminDashboard() {
  const { data: sektors } = useQuery<{ results: Sektor[] }>({
    queryKey: ["admin-sektors"],
    queryFn: () => api.get("/admin/engine/sektors/").then((r) => r.data),
  });

  const list = sektors?.results ?? [];
  const totalIzin = list.reduce((sum, s) => sum + s.permit_count, 0);
  const activeCount = list.filter((s) => s.is_active).length;

  const QUICK_STATS = [
    {
      label: "Total Sektor",
      value: list.length,
      icon: Layers,
      gradient: "from-khatulistiwa/15 to-khatulistiwa/5",
      iconColor: "text-khatulistiwa",
      ring: "ring-khatulistiwa/15",
    },
    {
      label: "Total Jenis Izin",
      value: totalIzin,
      icon: FileText,
      gradient: "from-jagawana/15 to-jagawana/5",
      iconColor: "text-jagawana",
      ring: "ring-jagawana/15",
    },
    {
      label: "Sektor Aktif",
      value: activeCount,
      icon: TrendingUp,
      gradient: "from-terakota/20 to-terakota/5",
      iconColor: "text-amber-600",
      ring: "ring-terakota/20",
    },
    {
      label: "Versi Engine",
      value: "v2.0",
      icon: Users,
      gradient: "from-purple-100/70 to-purple-50/30",
      iconColor: "text-purple-600",
      ring: "ring-purple-200/50",
    },
  ];

  return (
    <div className="p-7 max-w-5xl mx-auto space-y-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-buana text-sm mt-1">
          Kelola engine perizinan dan konfigurasi sektor Otorita IKN.
        </p>
      </motion.div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_STATS.map(({ label, value, icon: Icon, gradient, iconColor, ring }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-5 space-y-3"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} ring-1 ${ring}
                             flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{value}</p>
              <p className="text-xs text-buana mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          to="/admin/engine"
          className="group card-hover p-5 flex items-center gap-4"
        >
          <div className="h-11 w-11 rounded-xl bg-gradient-jagawana flex items-center justify-center shrink-0">
            <Settings className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Engine Builder</p>
            <p className="text-xs text-buana mt-0.5">Konfigurasi sektor, izin, dan alur kerja</p>
          </div>
          <ArrowRight className="h-4 w-4 text-buana opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </Link>

        <Link
          to="/admin/analytics"
          className="group card-hover p-5 flex items-center gap-4"
        >
          <div className="h-11 w-11 rounded-xl bg-khatulistiwa/15 flex items-center justify-center shrink-0 ring-1 ring-khatulistiwa/20">
            <TrendingUp className="h-5 w-5 text-khatulistiwa" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Analitik</p>
            <p className="text-xs text-buana mt-0.5">Statistik permohonan dan SLA</p>
          </div>
          <ArrowRight className="h-4 w-4 text-buana opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </Link>
      </div>

      {/* ── Sektor cards ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Sektor Terdaftar</h2>
          <Link to="/admin/engine" className="text-xs text-khatulistiwa hover:underline font-semibold">
            Kelola semua →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))
            : list.map((s, i) => (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.04 }}
                >
                  <Link
                    to={`/admin/engine/${s.key}`}
                    className="group card-hover p-4 block"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm group-hover:text-jagawana transition-colors">
                        {s.name}
                      </p>
                      <span className="text-[11px] text-buana bg-muted px-2 py-0.5 rounded-full shrink-0 font-medium">
                        {s.permit_count} izin
                      </span>
                    </div>
                    <p className="text-xs text-buana mt-1.5 flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.is_active ? "bg-jagawana" : "bg-buana"}`} />
                      {s.is_active ? "Aktif" : "Nonaktif"}
                    </p>
                  </Link>
                </motion.div>
              ))}
        </div>
      </div>
    </div>
  );
}
