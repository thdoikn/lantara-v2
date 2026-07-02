import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Coffee } from "lucide-react";
import { updateInstansi } from "../api";
import { errMsg } from "../queueStatus";
import { useTenantScope } from "../TenantLayout";
import { Header, Field } from "./TenantLoketsPage";
import { toast } from "@/lib/toast";

/** hh:mm:ss or null → hh:mm for a <input type=time>. */
function toTimeInput(v: string | null): string {
  return v ? v.slice(0, 5) : "";
}

export default function TenantSettingsPage() {
  const { tenant } = useTenantScope();
  const qc = useQueryClient();
  const [open, setOpen] = useState(toTimeInput(tenant.operating_open));
  const [close, setClose] = useState(toTimeInput(tenant.operating_close));
  const [breakStart, setBreakStart] = useState(toTimeInput(tenant.break_start));
  const [breakEnd, setBreakEnd] = useState(toTimeInput(tenant.break_end));

  const save = useMutation({
    mutationFn: () =>
      updateInstansi(tenant.id, {
        operating_open: open || null,
        operating_close: close || null,
        break_start: breakStart || null,
        break_end: breakEnd || null,
      }),
    onSuccess: () => {
      toast.success("Jam operasional disimpan.");
      qc.invalidateQueries({ queryKey: ["antrean", "admin-instansi"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="max-w-xl">
      <Header title="Jam Operasional" subtitle={`Atur jam layanan & istirahat ${tenant.name}.`} />

      <div className="space-y-5 rounded-2xl border border-pertiwi-muted bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-khatulistiwa-700">
          <Clock className="h-5 w-5 text-khatulistiwa-500" />
          <span className="font-semibold">Jam Layanan</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Buka">
            <TimeInput value={open} onChange={setOpen} />
          </Field>
          <Field label="Tutup">
            <TimeInput value={close} onChange={setClose} />
          </Field>
        </div>

        <div className="flex items-center gap-2 pt-2 text-khatulistiwa-700">
          <Coffee className="h-5 w-5 text-khatulistiwa-500" />
          <span className="font-semibold">Istirahat (opsional)</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mulai">
            <TimeInput value={breakStart} onChange={setBreakStart} />
          </Field>
          <Field label="Selesai">
            <TimeInput value={breakEnd} onChange={setBreakEnd} />
          </Field>
        </div>
        <p className="text-xs text-khatulistiwa-400">
          Saat istirahat, loket tidak mengambil maupun memanggil nomor. Kosongkan untuk memakai
          jam default MPP.
        </p>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-xl bg-khatulistiwa-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-60"
          >
            {save.isPending ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
    />
  );
}
