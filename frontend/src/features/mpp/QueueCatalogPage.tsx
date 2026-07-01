import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listInstansi, takeTicket, type Instansi, type Layanan } from "./api";
import { errMsg } from "./TicketView";
import { useAuthStore } from "@/lib/auth";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL: Record<string, string> = {
  cepat: "Cepat",
  sedang: "Sedang",
  lama: "Lama",
};

/**
 * Public catalog: pick a tenant (OIKN directorate or external agency), then a
 * service, then take an online-virtual number. Taking requires login (we need the
 * email for delivery + one-active-ticket enforcement).
 */
export default function QueueCatalogPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTenant, setActiveTenant] = useState<string | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["antrean", "instansi"],
    queryFn: listInstansi,
  });

  const take = useMutation({
    mutationFn: (layanan: string) => takeTicket(layanan),
    onSuccess: (t) => {
      toast.success(`Nomor ${t.number} berhasil diambil.`);
      navigate(`/antrean/tiket/${t.id}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const activeList = useMemo(() => {
    if (!tenants) return [];
    return activeTenant ? tenants.filter((t) => t.key === activeTenant) : tenants;
  }, [tenants, activeTenant]);

  function onTake(layanan: Layanan) {
    if (!isAuthenticated) {
      toast.info("Masuk untuk mengambil nomor antrean.");
      navigate("/auth/login");
      return;
    }
    take.mutate(layanan.id);
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <Link to="/" className="text-sm text-royal-600 hover:underline">
            ← Beranda
          </Link>
          <h1 className="mt-2 text-3xl font-display font-bold text-ink">Antrean MPP</h1>
          <p className="mt-1 text-ink-muted">
            Ambil nomor antrean untuk kunjungan ke Mal Pelayanan Publik IKN. Pilih instansi,
            lalu layanan yang Anda tuju.
          </p>
        </header>

        {isLoading ? (
          <p className="text-ink-muted">Memuat…</p>
        ) : (
          <>
            <TenantTabs
              tenants={tenants ?? []}
              active={activeTenant}
              onChange={setActiveTenant}
            />
            <div className="mt-6 space-y-8">
              {activeList.map((tenant) => (
                <TenantSection key={tenant.id} tenant={tenant} onTake={onTake} busy={take.isPending} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TenantTabs({
  tenants,
  active,
  onChange,
}: {
  tenants: Instansi[];
  active: string | null;
  onChange: (key: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill active={active === null} onClick={() => onChange(null)}>
        Semua
      </Pill>
      {tenants.map((t) => (
        <Pill key={t.id} active={active === t.key} onClick={() => onChange(t.key)}>
          {t.short_name || t.name}
          <span
            className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
              t.owner_type === "oikn"
                ? "bg-royal-100 text-royal-700"
                : "bg-gold-500/20 text-gold-500"
            }`}
          >
            {t.owner_type === "oikn" ? "OIKN" : "Eksternal"}
          </span>
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium ${
        active ? "bg-royal-600 text-white" : "border border-royal-200 text-ink-muted hover:bg-royal-50"
      }`}
    >
      {children}
    </button>
  );
}

function TenantSection({
  tenant,
  onTake,
  busy,
}: {
  tenant: Instansi;
  onTake: (l: Layanan) => void;
  busy: boolean;
}) {
  if (!tenant.layanan.length) return null;
  return (
    <section>
      <div className="flex items-center gap-3">
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
        )}
        <h2 className="font-display text-lg font-semibold text-ink">{tenant.name}</h2>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tenant.layanan.map((l) => (
          <div
            key={l.id}
            className="flex flex-col rounded-2xl border border-royal-100 bg-white p-4 shadow-sm"
          >
            <p className="font-semibold text-ink">{l.name}</p>
            <p className="mt-1 text-xs text-ink-faint">
              {CATEGORY_LABEL[l.category]} · ± {l.avg_minutes} menit
            </p>
            <button
              onClick={() => onTake(l)}
              disabled={busy}
              className="mt-4 rounded-xl bg-royal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-royal-700 disabled:opacity-60"
            >
              Ambil Nomor
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
