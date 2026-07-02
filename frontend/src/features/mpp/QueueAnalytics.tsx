import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download, Loader2, Ticket, CheckCircle2, UserX, Clock } from "lucide-react";
import api from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";

interface Analytics {
  range: { from: string; to: string };
  kpi: {
    issued: number;
    served: number;
    no_show: number;
    no_show_rate: number;
    cancelled: number;
    avg_wait_min: number | null;
    avg_service_min: number | null;
    demoted: number;
  };
  channel: { online: number; walkin: number };
  by_hour: { hour: number; issued: number }[];
  by_loket: { loket: string; served: number; avg_service: number | null }[];
  trend: { date: string; issued: number; served: number; no_show: number }[];
}

const KHATULISTIWA = "#185088";
const TERAKOTA = "#DBAF6C";
const SUCCESS = "#059669";
const DANGER = "#DC2626";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Reusable queue analytics dashboard, scoped server-side by role + params. */
export default function QueueAnalytics({
  instansi,
  loket,
  title = "Analitik Antrean",
}: {
  instansi?: string;
  loket?: string;
  title?: string;
}) {
  const [from, setFrom] = useState(isoDaysAgo(29));
  const [to, setTo] = useState(isoDaysAgo(0));

  const params = { from, to, ...(instansi ? { instansi } : {}), ...(loket ? { loket } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ["antrean", "analytics", params],
    queryFn: () => api.get("/antrean/analytics/", { params }).then((r) => r.data as Analytics),
  });

  async function exportCsv() {
    const qs = new URLSearchParams({ ...params, export: "csv" }).toString();
    try {
      await downloadFile(`/api/v1/antrean/analytics/?${qs}`, `antrean-${from}-${to}.csv`);
    } catch {
      toast.error("Gagal mengekspor CSV.");
    }
  }

  const channelData = data
    ? [
        { name: "Online", value: data.channel.online },
        { name: "Walk-in", value: data.channel.walkin },
      ]
    : [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-khatulistiwa-900">{title}</h1>
        <div className="flex flex-wrap items-end gap-2">
          <DateField label="Dari" value={from} onChange={setFrom} />
          <DateField label="Sampai" value={to} onChange={setTo} />
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pertiwi-muted bg-white px-3 py-2 text-sm font-semibold text-khatulistiwa-700 hover:bg-pertiwi-warm"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center gap-3 text-khatulistiwa-500/70">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat analitik…
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Ticket} label="Nomor Diterbitkan" value={data.kpi.issued} />
            <Kpi icon={CheckCircle2} label="Dilayani" value={data.kpi.served} tone="success" />
            <Kpi
              icon={UserX}
              label="Tidak Hadir"
              value={`${data.kpi.no_show} (${data.kpi.no_show_rate}%)`}
              tone="danger"
            />
            <Kpi
              icon={Clock}
              label="Rata-rata Tunggu"
              value={data.kpi.avg_wait_min != null ? `${data.kpi.avg_wait_min} mnt` : "—"}
            />
          </div>

          {/* Trend */}
          <Card title="Tren Harian">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="issued" name="Diterbitkan" stroke={KHATULISTIWA} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="served" name="Dilayani" stroke={SUCCESS} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="no_show" name="Tidak Hadir" stroke={DANGER} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* By hour */}
            <Card title="Nomor per Jam (jam tersibuk)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.by_hour} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D6" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="issued" name="Diterbitkan" fill={KHATULISTIWA} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Channel mix */}
            <Card title="Kanal (Online vs Walk-in)">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    <Cell fill={KHATULISTIWA} />
                    <Cell fill={TERAKOTA} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Per loket */}
          <Card title="Throughput per Loket">
            {data.by_loket.length === 0 ? (
              <p className="py-6 text-center text-sm text-khatulistiwa-400">Belum ada data loket.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-khatulistiwa-500">
                  <tr>
                    <th className="py-2 font-medium">Loket</th>
                    <th className="py-2 text-center font-medium">Dilayani</th>
                    <th className="py-2 text-center font-medium">Rata-rata Layanan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_loket.map((r) => (
                    <tr key={r.loket} className="border-t border-pertiwi-muted">
                      <td className="py-2 font-medium text-khatulistiwa-900">{r.loket}</td>
                      <td className="py-2 text-center text-khatulistiwa-700">{r.served}</td>
                      <td className="py-2 text-center text-khatulistiwa-700">
                        {r.avg_service != null ? `${r.avg_service} mnt` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Ticket;
  label: string;
  value: string | number;
  tone?: "success" | "danger";
}) {
  const color =
    tone === "success" ? "text-status-success" : tone === "danger" ? "text-status-danger" : "text-khatulistiwa-700";
  return (
    <div className="rounded-2xl border border-pertiwi-muted bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-khatulistiwa-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-pertiwi-muted bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-display font-semibold text-khatulistiwa-900">{title}</h3>
      {children}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-xs">
      <span className="mb-1 block font-medium text-khatulistiwa-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-pertiwi-muted px-3 py-1.5 text-sm text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
      />
    </label>
  );
}
