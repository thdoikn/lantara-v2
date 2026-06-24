import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, TrendingUp, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  total: number;
  active: number;
  approved: number;
  rejected: number;
  sla_breached: number;
  sla_at_risk: number;
  by_status: Record<string, number>;
}

interface SektorRow {
  sektor: string;
  sektor_key: string;
  total: number;
  active: number;
  approved: number;
  rejected: number;
  breached: number;
}

interface TrendPoint {
  date: string;
  count: number;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const STAT_VARIANTS = {
  default: {
    icon: "text-khatulistiwa",
    bg: "bg-gradient-to-br from-khatulistiwa/15 to-khatulistiwa/5",
    ring: "ring-khatulistiwa/15",
  },
  success: {
    icon: "text-jagawana",
    bg: "bg-gradient-to-br from-jagawana/15 to-jagawana/5",
    ring: "ring-jagawana/15",
  },
  danger: {
    icon: "text-saka",
    bg: "bg-gradient-to-br from-red-100/70 to-red-50/30",
    ring: "ring-red-200/50",
  },
  warn: {
    icon: "text-amber-600",
    bg: "bg-gradient-to-br from-amber-100/80 to-amber-50/40",
    ring: "ring-amber-200/60",
  },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  index = 0,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  variant?: keyof typeof STAT_VARIANTS;
  index?: number;
}) {
  const s = STAT_VARIANTS[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card p-5 flex items-center gap-4"
    >
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center ring-1 shrink-0", s.bg, s.ring)}>
        <Icon className={cn("h-5 w-5", s.icon)} aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-2xl font-bold">{value.toLocaleString("id-ID")}</p>
        <p className="text-xs text-buana mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery<Summary>({
    queryKey: ["analytics", "summary"],
    queryFn: () => api.get("/analytics/summary/").then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: bySektor = [], isLoading: loadingSektor } = useQuery<SektorRow[]>({
    queryKey: ["analytics", "by-sektor"],
    queryFn: () => api.get("/analytics/by-sektor/").then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: trend = [], isLoading: loadingTrend } = useQuery<TrendPoint[]>({
    queryKey: ["analytics", "trend", 30],
    queryFn: () => api.get("/analytics/trend/?days=30").then((r) => r.data),
    staleTime: 60_000,
  });

  function handleExport() {
    window.open("/api/v1/analytics/export/excel/", "_blank");
    toast.success("Menyiapkan unduhan Excel…");
  }

  return (
    <div className="p-7 space-y-7 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold">Analitik</h1>
          <p className="text-sm text-buana mt-0.5">Ringkasan data permohonan secara real-time</p>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary gap-2 text-sm"
          aria-label="Export ke Excel"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Excel
        </button>
      </motion.div>

      {/* Summary stats */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[76px] rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Permohonan" value={summary.total} icon={TrendingUp} index={0} />
          <StatCard label="Disetujui" value={summary.approved} icon={CheckCircle} variant="success" index={1} />
          <StatCard label="Ditolak" value={summary.rejected} icon={XCircle} variant="danger" index={2} />
          <StatCard label="SLA Terlampaui" value={summary.sla_breached} icon={AlertTriangle} variant="warn" index={3} />
        </div>
      ) : null}

      {/* Trend chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm mb-5">Tren Permohonan — 30 Hari Terakhir</h2>
        {loadingTrend ? (
          <div className="skeleton h-48 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#185088" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#185088" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#4B5E8A" }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#4B5E8A" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [v, "Permohonan"]}
                labelFormatter={(l: string) => `Tanggal: ${l}`}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#185088"
                strokeWidth={2}
                fill="url(#grad-green)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-sektor bar chart + table */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h2 className="font-semibold text-sm mb-5">Permohonan per Sektor</h2>
          {loadingSektor ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySektor} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="sektor"
                  tick={{ fontSize: 11, fill: "#4B5E8A" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#4B5E8A" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="approved" name="Disetujui" fill="#185088" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="active" name="Aktif" fill="#3B82F6" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="rejected" name="Ditolak" fill="#DC2626" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6 overflow-auto">
          <h2 className="font-semibold text-sm mb-4">Tabel Rekap Sektor</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-buana border-b border-border">
                <th className="text-left py-2 font-medium pb-3">Sektor</th>
                <th className="text-right py-2 font-medium pb-3">Total</th>
                <th className="text-right py-2 font-medium pb-3">Aktif</th>
                <th className="text-right py-2 font-medium pb-3">Setuju</th>
                <th className="text-right py-2 font-medium pb-3 text-saka">SLA</th>
              </tr>
            </thead>
            <tbody>
              {bySektor.map((row) => (
                <tr key={row.sektor_key} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-2.5 font-medium capitalize">{row.sektor || "—"}</td>
                  <td className="py-2.5 text-right tabular-nums">{row.total}</td>
                  <td className="py-2.5 text-right tabular-nums text-khatulistiwa font-semibold">{row.active}</td>
                  <td className="py-2.5 text-right tabular-nums text-jagawana font-semibold">{row.approved}</td>
                  <td className="py-2.5 text-right tabular-nums text-saka font-semibold">{row.breached}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
