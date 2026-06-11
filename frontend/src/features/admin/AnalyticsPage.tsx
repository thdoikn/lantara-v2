import { useQuery } from "@tanstack/react-query";
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

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  variant?: "default" | "success" | "danger" | "warn";
}) {
  const colors = {
    default: "text-khatulistiwa bg-khatulistiwa/10",
    success: "text-jagawana bg-jagawana/10",
    danger: "text-saka bg-saka/10",
    warn: "text-terakota bg-terakota/10",
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-5 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors[variant])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold font-display">{value.toLocaleString("id-ID")}</p>
        <p className="text-xs text-buana mt-0.5">{label}</p>
      </div>
    </div>
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
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Analitik</h1>
          <p className="text-sm text-buana mt-0.5">Ringkasan data permohonan secara real-time</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      {/* Summary stats */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Permohonan" value={summary.total} icon={TrendingUp} />
          <StatCard label="Disetujui" value={summary.approved} icon={CheckCircle} variant="success" />
          <StatCard label="Ditolak" value={summary.rejected} icon={XCircle} variant="danger" />
          <StatCard label="SLA Terlampaui" value={summary.sla_breached} icon={AlertTriangle} variant="warn" />
        </div>
      ) : null}

      {/* Trend chart */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-sm mb-5">Tren Permohonan — 30 Hari Terakhir</h2>
        {loadingTrend ? (
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#428A40" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#428A40" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, "Permohonan"]}
                labelFormatter={(l: string) => `Tanggal: ${l}`}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#428A40"
                strokeWidth={2}
                fill="url(#grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-sektor bar chart + table */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="font-semibold text-sm mb-5">Permohonan per Sektor</h2>
          {loadingSektor ? (
            <div className="h-48 bg-muted animate-pulse rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySektor} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="sektor" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="approved" name="Disetujui" fill="#428A40" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="active" name="Aktif" fill="#185088" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="rejected" name="Ditolak" fill="#EE2F24" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 overflow-auto">
          <h2 className="font-semibold text-sm mb-4">Tabel Rekap Sektor</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-buana border-b border-border">
                <th className="text-left py-1.5 font-medium">Sektor</th>
                <th className="text-right py-1.5 font-medium">Total</th>
                <th className="text-right py-1.5 font-medium">Aktif</th>
                <th className="text-right py-1.5 font-medium">Setuju</th>
                <th className="text-right py-1.5 font-medium text-saka">SLA ⚠</th>
              </tr>
            </thead>
            <tbody>
              {bySektor.map((row) => (
                <tr key={row.sektor_key} className="border-b border-border/50 hover:bg-muted/40">
                  <td className="py-2 font-medium capitalize">{row.sektor || "—"}</td>
                  <td className="py-2 text-right">{row.total}</td>
                  <td className="py-2 text-right text-khatulistiwa">{row.active}</td>
                  <td className="py-2 text-right text-jagawana">{row.approved}</td>
                  <td className="py-2 text-right text-saka">{row.breached}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
