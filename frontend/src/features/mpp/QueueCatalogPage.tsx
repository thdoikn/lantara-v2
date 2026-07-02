import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  X,
  ChevronRight,
  Users,
  Clock,
  Building2,
  MonitorSmartphone,
  SearchX,
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import BatangBanyu from "@/components/BatangBanyu";
import { cn } from "@/lib/cn";
import { listInstansi, takeTicket, type Instansi, type Layanan } from "./api";
import { errMsg } from "./queueStatus";
import { useAuthStore } from "@/lib/auth";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL: Record<string, string> = { cepat: "Cepat", sedang: "Sedang", lama: "Lama" };

function busyness(waiting: number): { label: string; cls: string } {
  if (waiting === 0) return { label: "Tidak ada antrean", cls: "text-status-success" };
  if (waiting <= 5) return { label: "Lengang", cls: "text-status-success" };
  if (waiting <= 15) return { label: "Cukup ramai", cls: "text-amber-700" };
  return { label: "Ramai", cls: "text-status-danger" };
}

export default function QueueCatalogPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTenant, setActiveTenant] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!tenants) return [];
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
  }, [tenants, activeTenant, q]);

  const totalServices = (tenants ?? []).reduce((n, t) => n + t.layanan.length, 0);

  function onTake(l: Layanan) {
    if (!isAuthenticated) {
      toast.info("Masuk untuk mengambil nomor antrean.");
      navigate("/auth/login");
      return;
    }
    take.mutate(l.id);
  }

  return (
    <main id="main-content" className="min-h-screen bg-pertiwi-warm">
      <PublicNav />

      {/* ── Dark hero header ── */}
      <div className="relative overflow-hidden bg-gradient-hero">
        <BatangBanyu variant="fill" opacity={0.05} className="text-terakota-400" />
        <div
          className="absolute -right-20 -top-20 h-96 w-96 opacity-[0.04] pointer-events-none"
          aria-hidden="true"
        >
          <div className="h-full w-full rounded-full border-[40px] border-terakota-500" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-8 pb-12 pt-28">
          <nav
            className="mb-6 flex items-center gap-2 text-xs text-khatulistiwa-300/50"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="transition-colors hover:text-terakota-400">
              Lantara
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/60">Antrean MPP</span>
          </nav>

          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-terakota-400">
              MAL PELAYANAN PUBLIK IKN
            </p>
            <h1 className="mb-4 font-display text-5xl font-black leading-tight text-white md:text-6xl">
              Ambil Nomor
              <br />
              Antrean
            </h1>
            <p className="text-lg text-khatulistiwa-200/60">
              {totalServices ? `${totalServices} ` : ""}layanan dari instansi OIKN &amp; mitra.
              Ambil nomor dari ponsel, pantau estimasi, lalu check-in saat tiba.
            </p>
          </div>

          {/* Search */}
          <div className="relative mt-8 max-w-2xl">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.15] bg-white/[0.08] px-5 py-4 transition-all focus-within:border-terakota-400/60 focus-within:bg-white/[0.12]">
              <Search className="h-5 w-5 shrink-0 text-white/40" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari layanan… (mis. KTP, BPJS, kesehatan)"
                className="flex-1 bg-transparent text-base text-white outline-none placeholder-white/30"
                aria-label="Cari layanan antrean"
              />
              {query ? (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 text-white/40 transition-colors hover:text-white"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="shrink-0 rounded-md border border-white/10 px-2 py-1 font-mono text-xs text-white/20">
                  /
                </kbd>
              )}
            </div>
          </div>

          <Link
            to="/antrean/kiosk"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-khatulistiwa-200/70 transition-colors hover:text-terakota-400"
          >
            <MonitorSmartphone className="h-4 w-4" /> Di lokasi? Gunakan mode anjungan (walk-in)
          </Link>
        </div>

        {/* Curved wave transition to cream */}
        <div className="relative h-8 text-pertiwi-warm" aria-hidden="true">
          <svg
            viewBox="0 0 1440 32"
            className="absolute bottom-0 w-full"
            preserveAspectRatio="none"
            style={{ height: "32px" }}
          >
            <path d="M0,32 L0,0 Q720,32 1440,0 L1440,32 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── Sticky tenant filter ── */}
      {!isLoading && tenants && (
        <div className="sticky top-16 z-20 border-b border-pertiwi-muted bg-pertiwi-warm">
          <div className="mx-auto max-w-6xl px-8 py-4">
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {[{ key: null, name: "Semua" }, ...tenants.map((t) => ({ key: t.key, name: t.short_name || t.name }))].map(
                (t) => {
                  const active = t.key === activeTenant;
                  return (
                    <button
                      key={t.key ?? "all"}
                      onClick={() => setActiveTenant(t.key)}
                      className={cn(
                        "flex-shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
                        active
                          ? "bg-khatulistiwa-600 text-white shadow-[0_4px_12px_rgba(24,80,136,0.35)]"
                          : "border border-pertiwi-muted bg-white text-khatulistiwa-700 shadow-sm hover:border-khatulistiwa-300 hover:text-khatulistiwa-600",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="mx-auto max-w-6xl px-8 py-10">
        {isLoading ? (
          <p className="text-khatulistiwa-500/70">Memuat layanan…</p>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-khatulistiwa-100">
              <SearchX className="h-8 w-8 text-khatulistiwa-400" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-bold text-khatulistiwa-900">
              Tidak ada layanan yang cocok
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-khatulistiwa-500/70">
              Coba kata kunci lain atau pilih instansi lain.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {visible.map((tenant) => (
              <TenantSection key={tenant.id} tenant={tenant} onTake={onTake} busy={take.isPending} />
            ))}
          </div>
        )}
      </div>
    </main>
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
    <section aria-labelledby={`tenant-${tenant.key}`} className="scroll-mt-32">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <TenantAvatar tenant={tenant} />
          <div className="min-w-0">
            <h2
              id={`tenant-${tenant.key}`}
              className="truncate font-display text-2xl font-black text-khatulistiwa-900"
            >
              {tenant.name}
            </h2>
            <p className="truncate text-sm text-khatulistiwa-500/70">
              {tenant.owner_type === "oikn" ? "Otorita IKN" : "Instansi Eksternal"}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-khatulistiwa-800 px-4 py-2 text-sm font-bold text-terakota-300">
          {tenant.layanan.length} layanan
        </span>
      </div>

      <div
        className="mb-6 h-px bg-gradient-to-r from-khatulistiwa-800/30 via-terakota-500/20 to-transparent"
        aria-hidden="true"
      />

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tenant.layanan.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="h-full"
          >
            <ServiceCard
              layanan={l}
              external={tenant.owner_type === "external"}
              onTake={() => onTake(l)}
              busy={busy}
            />
          </motion.div>
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
        className="h-12 w-12 rounded-2xl object-contain ring-1 ring-pertiwi-muted"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-khatulistiwa-800 shadow-md">
      <Building2
        className={`h-6 w-6 ${tenant.owner_type === "oikn" ? "text-terakota-400" : "text-terakota-300"}`}
        aria-hidden="true"
      />
    </div>
  );
}

function ServiceCard({
  layanan,
  external,
  onTake,
  busy,
}: {
  layanan: Layanan;
  external: boolean;
  onTake: () => void;
  busy: boolean;
}) {
  const b = busyness(layanan.waiting);
  const estWait = layanan.waiting * layanan.avg_minutes;
  return (
    <div
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-pertiwi-muted bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-khatulistiwa-300 hover:shadow-lg"
    >
      <div
        className={`h-1 w-full shrink-0 ${external ? "bg-terakota-500" : "bg-khatulistiwa-600"}`}
        aria-hidden="true"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-display text-base font-semibold leading-snug text-khatulistiwa-900">
            {layanan.name}
          </h4>
          <span className="shrink-0 rounded-full bg-khatulistiwa-50 px-2 py-0.5 text-[10px] font-semibold text-khatulistiwa-600">
            {CATEGORY_LABEL[layanan.category]}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-khatulistiwa-500/80">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-khatulistiwa-400/70" /> {layanan.waiting} antre
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-khatulistiwa-400/70" /> ± {layanan.avg_minutes} mnt
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className={`text-xs font-semibold ${b.cls}`}>{b.label}</span>
          {layanan.waiting > 0 && (
            <span className="text-[11px] text-khatulistiwa-400">est. ± {estWait} mnt</span>
          )}
        </div>

        <button
          onClick={onTake}
          disabled={busy}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-khatulistiwa-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-khatulistiwa-500 disabled:opacity-60"
        >
          Ambil Nomor
          <ChevronRight className="h-4 w-4 transition-all group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
