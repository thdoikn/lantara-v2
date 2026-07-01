import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ArrowRight,
  Users,
  Clock,
  ArrowLeft,
  MonitorSmartphone,
  Loader2,
  Ticket as TicketIcon,
} from "lucide-react";
import { listInstansi, takeTicket, type Instansi, type Layanan } from "./api";
import { errMsg } from "./queueStatus";
import { useAuthStore } from "@/lib/auth";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL: Record<string, string> = { cepat: "Cepat", sedang: "Sedang", lama: "Lama" };

/** Busyness label + tone from the live waiting count. */
function busyness(waiting: number): { label: string; cls: string } {
  if (waiting === 0) return { label: "Tidak ada antrean", cls: "text-status-success" };
  if (waiting <= 5) return { label: "Lengang", cls: "text-status-success" };
  if (waiting <= 15) return { label: "Cukup ramai", cls: "text-gold-500" };
  return { label: "Ramai", cls: "text-status-danger" };
}

export default function QueueCatalogPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTenant, setActiveTenant] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["antrean", "instansi"],
    queryFn: listInstansi,
    refetchInterval: 30_000,
  });

  const take = useMutation({
    mutationFn: (layanan: string) => takeTicket(layanan),
    onSuccess: (t) => {
      toast.success(`Nomor ${t.number} berhasil diambil.`);
      qc.invalidateQueries({ queryKey: ["antrean", "instansi"] });
      navigate(`/antrean/tiket/${t.id}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const visible = useMemo(() => {
    if (!tenants) return [];
    const q = query.trim().toLowerCase();
    return tenants
      .filter((t) => !activeTenant || t.key === activeTenant)
      .map((t) => ({
        ...t,
        layanan: q
          ? t.layanan.filter(
              (l) => l.name.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
            )
          : t.layanan,
      }))
      .filter((t) => t.layanan.length > 0);
  }, [tenants, activeTenant, query]);

  function onTake(l: Layanan) {
    if (!isAuthenticated) {
      toast.info("Masuk untuk mengambil nomor antrean.");
      navigate("/auth/login");
      return;
    }
    take.mutate(l.id);
  }

  return (
    <div className="min-h-screen bg-surface pb-16">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-royal text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-royal-100 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <TicketIcon className="h-6 w-6 text-gold-500" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-royal-200">
              Mal Pelayanan Publik IKN
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Ambil Nomor Antrean</h1>
          <p className="mt-2 max-w-2xl text-royal-100">
            Pilih instansi dan layanan yang Anda tuju. Ambil nomor dari ponsel, pantau estimasi,
            lalu check-in saat tiba di lokasi.
          </p>

          {/* Search */}
          <div className="mt-5 flex max-w-xl items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
            <Search className="h-5 w-5 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari layanan… (mis. KTP, BPJS, kesehatan)"
              className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint"
              aria-label="Cari layanan"
            />
          </div>

          <Link
            to="/antrean/kiosk"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-royal-100 hover:text-white"
          >
            <MonitorSmartphone className="h-4 w-4" /> Di lokasi? Gunakan mode anjungan (walk-in)
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4">
        {/* Tenant filter */}
        {!isLoading && tenants && (
          <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-surface/90 px-4 py-3 backdrop-blur">
            <Pill active={activeTenant === null} onClick={() => setActiveTenant(null)}>
              Semua
            </Pill>
            {tenants.map((t) => (
              <Pill key={t.id} active={activeTenant === t.key} onClick={() => setActiveTenant(t.key)}>
                {t.short_name || t.name}
              </Pill>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-ink-muted">
            <Loader2 className="h-6 w-6 animate-spin" /> Memuat layanan…
          </div>
        ) : visible.length === 0 ? (
          <p className="mt-16 text-center text-ink-muted">
            Tidak ada layanan yang cocok dengan pencarian Anda.
          </p>
        ) : (
          <div className="mt-4 space-y-8">
            {visible.map((tenant) => (
              <TenantSection
                key={tenant.id}
                tenant={tenant}
                onTake={onTake}
                busy={take.isPending}
              />
            ))}
          </div>
        )}
      </div>
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
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-royal-600 text-white shadow-sm"
          : "border border-royal-200 bg-white text-ink-muted hover:bg-royal-50"
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
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <TenantAvatar tenant={tenant} />
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{tenant.name}</h2>
          <span
            className={`text-xs font-medium ${
              tenant.owner_type === "oikn" ? "text-royal-600" : "text-gold-500"
            }`}
          >
            {tenant.owner_type === "oikn" ? "Otorita IKN" : "Instansi Eksternal"}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tenant.layanan.map((l) => (
          <ServiceCard key={l.id} layanan={l} onTake={() => onTake(l)} busy={busy} />
        ))}
      </div>
    </section>
  );
}

function TenantAvatar({ tenant }: { tenant: Instansi }) {
  if (tenant.logo_url) {
    return (
      <img
        src={tenant.logo_url}
        alt=""
        className="h-11 w-11 rounded-xl object-contain ring-1 ring-royal-100"
      />
    );
  }
  const initials = (tenant.short_name || tenant.name)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl font-display font-bold text-white ${
        tenant.owner_type === "oikn" ? "bg-royal-600" : "bg-gold-500"
      }`}
    >
      {initials}
    </div>
  );
}

function ServiceCard({
  layanan,
  onTake,
  busy,
}: {
  layanan: Layanan;
  onTake: () => void;
  busy: boolean;
}) {
  const b = busyness(layanan.waiting);
  const estWait = layanan.waiting * layanan.avg_minutes;
  return (
    <div className="group flex flex-col rounded-2xl border border-royal-100 bg-white p-4 shadow-sm transition hover:border-royal-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">{layanan.name}</p>
        <span className="shrink-0 rounded-full bg-royal-50 px-2 py-0.5 text-[10px] font-medium text-royal-600">
          {CATEGORY_LABEL[layanan.category]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <Users className="h-3.5 w-3.5" /> {layanan.waiting} antre
        </span>
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <Clock className="h-3.5 w-3.5" /> ± {layanan.avg_minutes} mnt/org
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className={`text-xs font-medium ${b.cls}`}>{b.label}</span>
        {layanan.waiting > 0 && (
          <span className="text-[11px] text-ink-faint">est. tunggu ± {estWait} mnt</span>
        )}
      </div>

      <button
        onClick={onTake}
        disabled={busy}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-royal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-royal-700 disabled:opacity-60"
      >
        Ambil Nomor <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
