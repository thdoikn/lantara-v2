import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, FileText, ArrowRight, TrendingUp, Layers, AlertCircle, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";

interface Sektor {
  key: string;
  name: string;
  permit_count: number;
  is_active: boolean;
}

interface AdminIzin {
  key: string;
  name: string;
  sektor_key: string;
  is_published: boolean;
  has_unpublished_changes: boolean;
  is_publish_ready: boolean;
  readiness_missing: string[];
}

export default function AdminDashboard() {
  const { data: sektors } = useQuery<{ results: Sektor[] }>({
    queryKey: ["admin-sektors"],
    queryFn: () => api.get("/admin/engine/sektors/").then((r) => r.data),
  });

  // All izin, to surface config that needs attention (drafts / unpublished edits).
  const { data: izinData } = useQuery<{ results: AdminIzin[] }>({
    queryKey: ["admin-all-izin"],
    queryFn: () => api.get("/admin/engine/permit-types/?page_size=200").then((r) => r.data),
  });

  const list = sektors?.results ?? [];
  const totalIzin = list.reduce((sum, s) => sum + s.permit_count, 0);
  const activeCount = list.filter((s) => s.is_active).length;

  const allIzin = izinData?.results ?? [];
  const attention = allIzin.filter(
    (z) => (z.is_published && z.has_unpublished_changes) || !z.is_publish_ready,
  );

  const QUICK_STATS: {
    label: string;
    value: number | string;
    icon: LucideIcon;
    navy?: boolean;
    iconBg: string;
    iconColor: string;
    cardBg: string;
    cardBorder: string;
  }[] = [
    {
      label: "Total Sektor",
      value: list.length,
      icon: Layers,
      navy: true,
      iconBg: "",
      iconColor: "",
      cardBg: "",
      cardBorder: "",
    },
    {
      label: "Total Jenis Izin",
      value: totalIzin,
      icon: FileText,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      cardBg: "bg-emerald-50",
      cardBorder: "border-emerald-200",
    },
    {
      label: "Sektor Aktif",
      value: activeCount,
      icon: TrendingUp,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      cardBg: "bg-amber-50",
      cardBorder: "border-amber-200",
    },
    {
      label: "Perlu Perhatian",
      value: attention.length,
      icon: AlertCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      cardBg: "bg-red-50",
      cardBorder: "border-red-200",
    },
  ];

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="font-display text-2xl font-bold text-khatulistiwa-900">Admin Dashboard</h1>
        <p className="text-khatulistiwa-600/70 text-sm mt-1">
          Kelola engine perizinan dan konfigurasi sektor Otorita IKN.
        </p>
      </motion.div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_STATS.map(({ label, value, icon: Icon, navy, iconBg, iconColor, cardBg, cardBorder }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={
              navy
                ? "relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between min-h-[140px] text-white"
                : `rounded-2xl border p-5 flex flex-col justify-between min-h-[140px] ${cardBg} ${cardBorder}`
            }
            style={navy ? { background: "linear-gradient(135deg, #0D3060 0%, #185088 100%)" } : undefined}
          >
            {navy && (
              <div
                className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none"
                style={{ background: "#DBAF6C" }}
                aria-hidden="true"
              />
            )}
            <div className={navy ? "h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center" : `h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={navy ? "h-5 w-5 text-white" : `h-5 w-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <p className={navy ? "font-display text-2xl font-bold text-white" : "font-display text-2xl font-bold text-khatulistiwa-900"}>{value}</p>
              <p className={navy ? "text-xs text-white/70 mt-0.5" : "text-xs text-khatulistiwa-600/70 mt-0.5"}>{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          to="/admin/engine"
          className="group bg-white border border-khatulistiwa-100 hover:border-khatulistiwa-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0D3060 0%, #185088 100%)" }}>
            <Settings className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-khatulistiwa-900">Engine Builder</p>
            <p className="text-xs text-khatulistiwa-600/70 mt-0.5">Konfigurasi sektor, izin, dan alur kerja</p>
          </div>
          <ArrowRight className="h-4 w-4 text-khatulistiwa-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </Link>

        <Link
          to="/admin/analytics"
          className="group bg-white border border-khatulistiwa-100 hover:border-khatulistiwa-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="h-11 w-11 rounded-xl bg-khatulistiwa-50 flex items-center justify-center shrink-0 border border-khatulistiwa-200">
            <TrendingUp className="h-5 w-5 text-khatulistiwa-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-khatulistiwa-900">Analitik</p>
            <p className="text-xs text-khatulistiwa-600/70 mt-0.5">Statistik permohonan dan SLA</p>
          </div>
          <ArrowRight className="h-4 w-4 text-khatulistiwa-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </Link>
      </div>

      {/* ── Needs attention ── */}
      {attention.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <h2 className="font-display font-bold text-sm text-amber-900">
              {attention.length} izin perlu perhatian
            </h2>
          </div>
          <div className="space-y-1.5">
            {attention.slice(0, 6).map((z) => (
              <Link
                key={z.key}
                to={`/admin/engine/${z.sektor_key}/${z.key}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/70 hover:bg-white px-3 py-2 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-khatulistiwa-900 truncate">{z.name}</span>
                  <span className="block text-xs text-amber-700/80">
                    {!z.is_publish_ready
                      ? `Belum siap diterbitkan — ${z.readiness_missing[0] ?? ""}`
                      : "Perubahan belum diterbitkan"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-khatulistiwa-300 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
          {attention.length > 6 && (
            <p className="text-xs text-amber-700/70">…dan {attention.length - 6} lainnya.</p>
          )}
        </motion.div>
      )}

      {/* ── Sektor cards ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-khatulistiwa-900">Sektor Terdaftar</h2>
          <Link to="/admin/engine" className="text-xs text-khatulistiwa-600 hover:underline font-semibold">
            Kelola semua →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-white animate-pulse border border-khatulistiwa-100" />
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
                    className="group block bg-white border border-khatulistiwa-100 hover:border-khatulistiwa-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-khatulistiwa-900 group-hover:text-khatulistiwa-600 transition-colors">
                        {s.name}
                      </p>
                      <span className="text-[11px] text-khatulistiwa-600/70 bg-khatulistiwa-50 px-2 py-0.5 rounded-full shrink-0 font-medium">
                        {s.permit_count} izin
                      </span>
                    </div>
                    <p className="text-xs text-khatulistiwa-600/70 mt-1.5 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-khatulistiwa-300"}`} />
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
