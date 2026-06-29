import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Loket } from "./api";

interface ServiceRow {
  layanan: string;
  name: string;
  counts: Record<string, number>;
}
interface MonitorData {
  loket: Loket[];
  services: ServiceRow[];
}

async function getMonitor(): Promise<MonitorData> {
  const { data } = await api.get("/antrean/monitor/");
  return data;
}

const COUNT_KEYS: [string, string][] = [
  ["reserved", "Dipesan"],
  ["in_pool", "Menunggu"],
  ["called", "Dipanggil"],
  ["serving", "Dilayani"],
  ["served", "Selesai"],
  ["no_show", "Tidak Hadir"],
];

export default function SupervisorMonitorPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["antrean", "monitor"],
    queryFn: getMonitor,
    refetchInterval: 15_000,
  });

  if (isLoading) return <p className="text-ink-muted">Memuat monitor…</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Status Loket</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.loket ?? []).map((l) => (
            <div key={l.id} className="rounded-2xl border border-royal-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{l.code}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.is_open
                      ? "bg-status-success/10 text-status-success"
                      : "bg-ink-faint/10 text-ink-faint"
                  }`}
                >
                  {l.is_open ? "Terbuka" : "Tertutup"}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-faint">{l.operator_name ?? "Tanpa petugas"}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Kedalaman Antrean per Layanan</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-royal-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-royal-50 text-left text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Layanan</th>
                {COUNT_KEYS.map(([, label]) => (
                  <th key={label} className="px-3 py-2 text-center font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.services ?? []).map((s) => (
                <tr key={s.layanan} className="border-t border-royal-50">
                  <td className="px-4 py-2 font-medium text-ink">{s.name}</td>
                  {COUNT_KEYS.map(([key]) => (
                    <td key={key} className="px-3 py-2 text-center text-ink-muted">
                      {s.counts[key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Parameter antrean (porsi 60/40, jendela check-in, rasio prioritas, jam operasional)
          dikelola melalui panel admin.
        </p>
      </section>
    </div>
  );
}
