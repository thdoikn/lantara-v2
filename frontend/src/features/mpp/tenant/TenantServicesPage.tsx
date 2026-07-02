import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Plus, Trash2 } from "lucide-react";
import {
  adminListLayanan,
  createLayanan,
  updateLayanan,
  deleteLayanan,
  type Layanan,
} from "../api";
import { errMsg } from "../queueStatus";
import { useTenantScope } from "../tenantScope";
import { Header, Loading, Modal, Field } from "./TenantLoketsPage";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL: Record<string, string> = { cepat: "Cepat", sedang: "Sedang", lama: "Lama" };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function TenantServicesPage() {
  const { tenant } = useTenantScope();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: all, isLoading } = useQuery({
    queryKey: ["antrean", "admin-layanan"],
    queryFn: adminListLayanan,
  });
  const services = useMemo(
    () => (all ?? []).filter((l) => l.instansi === tenant.id),
    [all, tenant.id],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["antrean", "admin-layanan"] });
    qc.invalidateQueries({ queryKey: ["antrean", "admin-instansi"] });
    qc.invalidateQueries({ queryKey: ["antrean", "instansi"] });
  };

  return (
    <div>
      <Header
        title="Layanan"
        subtitle={`Layanan yang bisa diambil nomornya oleh warga di ${tenant.name}.`}
        action={
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500"
          >
            <Plus className="h-4 w-4" /> Tambah Layanan
          </button>
        }
      />

      {isLoading ? (
        <Loading />
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-pertiwi-muted bg-white p-8 text-center">
          <p className="text-khatulistiwa-500/80">
            Belum ada layanan. Tambahkan layanan agar tenant ini muncul di antrean warga.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-khatulistiwa-500"
          >
            <Plus className="h-4 w-4" /> Tambah Layanan Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <ServiceRow key={s.id} service={s} onChanged={invalidate} />
          ))}
        </div>
      )}

      {creating && (
        <CreateServiceDialog
          tenantId={tenant.id}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function ServiceRow({ service, onChanged }: { service: Layanan; onChanged: () => void }) {
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
      onChanged();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const remove = useMutation({
    mutationFn: () => deleteLayanan(service.id),
    onSuccess: () => {
      toast.info("Layanan dihapus.");
      onChanged();
    },
    onError: () => toast.error("Tidak bisa menghapus layanan yang sudah memiliki tiket."),
  });

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-pertiwi-muted bg-white p-4 shadow-sm">
      <div className="min-w-[10rem] flex-1">
        <p className="font-semibold text-khatulistiwa-900">{service.name}</p>
        <p className="text-xs text-khatulistiwa-400">
          {CATEGORY_LABEL[service.category]} · {service.waiting} antre
        </p>
        {service.loket_count === 0 && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-terakota-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            ⚠ Belum ada loket yang melayani — nomor tidak akan terpanggil
          </p>
        )}
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
      <button
        onClick={() => {
          if (confirm(`Hapus layanan ${service.name}?`)) remove.mutate();
        }}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-status-danger hover:bg-status-danger/5"
        aria-label="Hapus layanan"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function CreateServiceDialog({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"cepat" | "sedang" | "lama">("sedang");
  const [avg, setAvg] = useState("10");
  const [quota, setQuota] = useState("");

  const save = useMutation({
    mutationFn: () =>
      createLayanan({
        instansi: tenantId,
        key: slugify(name),
        name,
        category,
        avg_minutes: Number(avg) || 10,
        daily_quota: quota === "" ? null : Number(quota),
      }),
    onSuccess: () => {
      toast.success("Layanan dibuat.");
      onSaved();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal title="Tambah Layanan" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nama layanan">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Cetak Kartu, Konsultasi"
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
          />
        </Field>
        <Field label="Kategori (memengaruhi estimasi)">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "cepat" | "sedang" | "lama")}
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
          >
            <option value="cepat">Cepat</option>
            <option value="sedang">Sedang</option>
            <option value="lama">Lama</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Menit/layanan">
            <input
              type="number"
              min={1}
              value={avg}
              onChange={(e) => setAvg(e.target.value)}
              className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
            />
          </Field>
          <Field label="Maks./hari (kosong = ∞)">
            <input
              type="number"
              min={0}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              placeholder="∞"
              className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 outline-none focus:border-khatulistiwa-400"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-khatulistiwa-500">
            Batal
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!name.trim() || save.isPending}
            className="rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-60"
          >
            {save.isPending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </Modal>
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
