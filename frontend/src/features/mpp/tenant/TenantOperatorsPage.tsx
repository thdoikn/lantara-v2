import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Search } from "lucide-react";
import {
  listStaff,
  createStaff,
  deleteStaff,
  searchStaffUsers,
  listLoket,
  type StaffUser,
} from "../api";
import { errMsg } from "../queueStatus";
import { useTenantScope } from "../tenantScope";
import { Header, Loading, Empty, Modal, Field } from "./TenantLoketsPage";
import { toast } from "@/lib/toast";

export default function TenantOperatorsPage() {
  const { tenant } = useTenantScope();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["antrean", "staff"],
    queryFn: listStaff,
  });
  const rows = useMemo(
    () =>
      (staff ?? []).filter(
        (s) => s.instansi === tenant.id && s.role_scope === "loket_operator",
      ),
    [staff, tenant.id],
  );

  const remove = useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      toast.info("Penugasan dihapus.");
      qc.invalidateQueries({ queryKey: ["antrean", "staff"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      <Header
        title="Petugas Loket"
        subtitle={`Tugaskan petugas ke loket ${tenant.name}. (Peran Petugas Loket diberikan oleh admin OIKN lebih dulu.)`}
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500"
          >
            <UserPlus className="h-4 w-4" /> Tugaskan Petugas
          </button>
        }
      />

      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="Belum ada petugas yang ditugaskan." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-pertiwi-muted bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-pertiwi-warm text-left text-khatulistiwa-500">
              <tr>
                <th className="px-4 py-2 font-medium">Petugas</th>
                <th className="px-4 py-2 font-medium">Loket</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-pertiwi-muted">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-khatulistiwa-900">{s.user_name}</p>
                    <p className="text-xs text-khatulistiwa-400">{s.user_email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-khatulistiwa-700">
                    {s.loket_code ?? "Semua loket"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => remove.mutate(s.id)}
                      className="inline-flex items-center gap-1 text-status-danger hover:underline"
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <AddOperatorDialog
          tenantId={tenant.id}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["antrean", "staff"] });
          }}
        />
      )}
    </div>
  );
}

function AddOperatorDialog({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<StaffUser | null>(null);
  const [loketId, setLoketId] = useState<string>("");

  const { data: results } = useQuery({
    queryKey: ["antrean", "staff-users", q],
    queryFn: () => searchStaffUsers(q),
    enabled: !picked,
  });
  const { data: allLoket } = useQuery({ queryKey: ["antrean", "loket"], queryFn: listLoket });
  const lokets = (allLoket ?? []).filter((l) => l.instansi === tenantId);

  const save = useMutation({
    mutationFn: () =>
      createStaff({ user: picked!.id, instansi: tenantId, loket: loketId || null }),
    onSuccess: () => {
      toast.success("Petugas ditugaskan.");
      onSaved();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal title="Tugaskan Petugas Loket" onClose={onClose}>
      <div className="space-y-4">
        {!picked ? (
          <Field label="Cari petugas (berperan Petugas Loket)">
            <div className="flex items-center gap-2 rounded-xl border border-pertiwi-muted px-3 py-2">
              <Search className="h-4 w-4 text-khatulistiwa-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="nama atau email…"
                className="w-full outline-none"
              />
            </div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {(results ?? []).map((u) => (
                <button
                  key={u.id}
                  onClick={() => setPicked(u)}
                  className="flex w-full flex-col rounded-lg px-3 py-1.5 text-left hover:bg-pertiwi-warm"
                >
                  <span className="text-sm font-medium text-khatulistiwa-900">{u.full_name}</span>
                  <span className="text-xs text-khatulistiwa-400">{u.email}</span>
                </button>
              ))}
              {results && results.length === 0 && (
                <p className="px-1 py-2 text-xs text-khatulistiwa-400">
                  Tidak ada pengguna dengan peran Petugas Loket. Minta admin OIKN memberi peran
                  tersebut lebih dulu.
                </p>
              )}
            </div>
          </Field>
        ) : (
          <div className="rounded-xl bg-pertiwi-warm p-3">
            <p className="text-sm font-medium text-khatulistiwa-900">{picked.full_name}</p>
            <p className="text-xs text-khatulistiwa-400">{picked.email}</p>
            <button
              onClick={() => setPicked(null)}
              className="mt-1 text-xs text-khatulistiwa-600 hover:underline"
            >
              Ganti
            </button>
          </div>
        )}

        <Field label="Loket (kosongkan = semua loket tenant)">
          <select
            value={loketId}
            onChange={(e) => setLoketId(e.target.value)}
            className="w-full rounded-xl border border-pertiwi-muted px-3 py-2 text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
          >
            <option value="">Semua loket</option>
            {lokets.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-khatulistiwa-500">
            Batal
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!picked || save.isPending}
            className="rounded-xl bg-khatulistiwa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-khatulistiwa-500 disabled:opacity-60"
          >
            {save.isPending ? "Menyimpan…" : "Tugaskan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
