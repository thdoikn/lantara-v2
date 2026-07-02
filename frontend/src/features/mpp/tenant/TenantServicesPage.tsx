import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { adminListLayanan, updateLayanan, type Layanan } from "../api";
import { errMsg } from "../queueStatus";
import { useTenantScope } from "../TenantLayout";
import { Header, Loading, Empty } from "./TenantLoketsPage";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL: Record<string, string> = { cepat: "Cepat", sedang: "Sedang", lama: "Lama" };

export default function TenantServicesPage() {
  const { tenant } = useTenantScope();
  const { data: all, isLoading } = useQuery({
    queryKey: ["antrean", "admin-layanan"],
    queryFn: adminListLayanan,
  });
  const services = useMemo(
    () => (all ?? []).filter((l) => l.instansi === tenant.id),
    [all, tenant.id],
  );

  return (
    <div>
      <Header
        title="Layanan"
        subtitle={`Atur kuota harian (maks. antrean) & estimasi per layanan ${tenant.name}.`}
      />
      {isLoading ? (
        <Loading />
      ) : services.length === 0 ? (
        <Empty text="Belum ada layanan pada tenant ini." />
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <ServiceRow key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceRow({ service }: { service: Layanan }) {
  const qc = useQueryClient();
  const [quota, setQuota] = useState<string>(service.daily_quota?.toString() ?? "");
  const [avg, setAvg] = useState<string>(service.avg_minutes.toString());

  useEffect(() => {
    setQuota(service.daily_quota?.toString() ?? "");
    setAvg(service.avg_minutes.toString());
  }, [service.daily_quota, service.avg_minutes]);

  const dirty =
    quota !== (service.daily_quota?.toString() ?? "") || avg !== service.avg_minutes.toString();

  const save = useMutation({
    mutationFn: () =>
      updateLayanan(service.id, {
        daily_quota: quota === "" ? null : Number(quota),
        avg_minutes: Number(avg),
      }),
    onSuccess: () => {
      toast.success(`${service.name} diperbarui.`);
      qc.invalidateQueries({ queryKey: ["antrean", "admin-layanan"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-pertiwi-muted bg-white p-4 shadow-sm">
      <div className="min-w-[10rem] flex-1">
        <p className="font-semibold text-khatulistiwa-900">{service.name}</p>
        <p className="text-xs text-khatulistiwa-400">
          {CATEGORY_LABEL[service.category]} · {service.waiting} antre
        </p>
      </div>
      <NumField label="Maks. antrean/hari" value={quota} onChange={setQuota} placeholder="∞" />
      <NumField label="Menit/layanan" value={avg} onChange={setAvg} />
      <button
        onClick={() => save.mutate()}
        disabled={!dirty || save.isPending}
        className="inline-flex items-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-40"
      >
        <Save className="h-4 w-4" /> Simpan
      </button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block font-medium text-khatulistiwa-500">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-lg border border-pertiwi-muted px-3 py-1.5 text-sm text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
      />
    </label>
  );
}
