import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import { useState, useRef, useEffect } from "react";
import { Search, ChevronRight, Clock, FileText, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { getSektorVisual } from "@/lib/sektorVisuals";
import type { Sektor, PermitType } from "@/types";

// ── Command palette search ────────────────────────────────────────────────────

function CommandSearch({
  query,
  setQuery,
  permits,
}: {
  query: string;
  setQuery: (q: string) => void;
  permits: PermitType[];
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  const results = query.trim()
    ? permits.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sektor_name?.toLowerCase().includes(query.toLowerCase()) ||
          p.product_name?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[selected]) navigate(`/layanan/${results[selected].key}`);
    else if (e.key === "Escape") setQuery("");
  }

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative max-w-2xl">
      <div className="flex items-center bg-white/[0.08] border border-white/[0.15] rounded-2xl px-5 py-4 gap-3
                      focus-within:border-terakota-400/60 focus-within:bg-white/[0.12] transition-all">
        <Search className="w-5 h-5 text-white/40 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari jenis izin, sektor, atau kode KBLI…"
          className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
          aria-label="Cari layanan perizinan"
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        <kbd className="text-white/20 text-xs border border-white/10 px-2 py-1 rounded-md font-mono shrink-0">
          /
        </kbd>
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.ul
            id="search-results"
            role="listbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute z-50 mt-2 w-full rounded-2xl bg-khatulistiwa-900 ring-1 ring-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {results.slice(0, 8).map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === selected}>
                <Link
                  to={`/layanan/${p.key}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    i === selected ? "bg-white/[0.06]" : "hover:bg-white/[0.06]"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-khatulistiwa-600/20 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-khatulistiwa-300" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-khatulistiwa-300/50">{p.sektor_name}</p>
                  </div>
                  <span className="text-xs text-khatulistiwa-300/50 shrink-0 font-medium">{p.sla_days} hari</span>
                  <ChevronRight className="h-4 w-4 text-khatulistiwa-300/40 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Permit card — white on cream ──────────────────────────────────────────────

function PermitCard({ permit, accentClass }: { permit: PermitType; accentClass: string }) {
  return (
    <Link
      to={`/layanan/${permit.key}`}
      className="group flex flex-col h-full bg-white rounded-2xl border border-pertiwi-muted
                 shadow-sm hover:shadow-lg hover:border-khatulistiwa-300 hover:-translate-y-1
                 transition-all duration-200 overflow-hidden"
    >
      {/* Sektor accent bar */}
      <div className={`h-1 w-full shrink-0 ${accentClass}`} aria-hidden="true" />

      <div className="p-5 flex flex-col flex-1">
        <h4 className="text-khatulistiwa-900 font-display font-semibold text-base leading-snug flex-1">
          {permit.name}
        </h4>

        {/* SLA — plain text, no pill wrapper */}
        <div className="flex items-center gap-1.5 mt-3">
          <Clock className="w-3.5 h-3.5 text-khatulistiwa-400/50 flex-shrink-0" aria-hidden="true" />
          <span className="text-khatulistiwa-500/60 text-xs">{permit.sla_days} hari kerja</span>
        </div>
        {/* Berusaha: plain text only when true, no pill */}
        {permit.is_berusaha && (
          <span className="text-amber-600 text-xs font-medium mt-1 block">Izin Berusaha</span>
        )}

        <div className="flex items-center justify-end mt-4 pt-3 border-t border-pertiwi-muted">
          <span className="text-khatulistiwa-600 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Pelajari <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServiceCatalog() {
  const [query, setQuery] = useState("");
  const [activeSektor, setActiveSektor] = useState<string | null>(null);

  const { data: sektors } = useQuery<Sektor[]>({
    queryKey: ["sektors"],
    queryFn: () => api.get("/sektors/").then((r) => r.data.results ?? r.data),
  });

  const { data: allPermits } = useQuery<PermitType[]>({
    queryKey: ["permit-types", "all"],
    queryFn: () => api.get("/permit-types/?page_size=200").then((r) => r.data.results ?? r.data),
  });

  const displayedSektor = activeSektor
    ? sektors?.filter((s) => s.key === activeSektor)
    : sektors;

  const permitsBySektor = (sektorKey: string) =>
    (allPermits ?? []).filter((p) => p.sektor_key === sektorKey);

  return (
    <main id="main-content" className="min-h-screen bg-pertiwi-warm">
      <PublicNav />

      {/* ── Dark hero header ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #04182A 0%, #0A2540 50%, #0D3060 100%)" }}
      >
        {/* Decorative ring watermark */}
        <div
          className="absolute -right-20 -top-20 w-96 h-96 opacity-[0.04] pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-full h-full rounded-full border-[40px] border-terakota-500" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 pt-28 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-khatulistiwa-300/50 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-terakota-400 transition-colors">Lantara</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/60">Katalog Layanan</span>
          </nav>

          {/* Heading — left aligned */}
          <div className="max-w-2xl">
            <p className="text-terakota-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
              KATALOG LAYANAN
            </p>
            <h1 className="text-white font-display font-black text-5xl md:text-6xl leading-tight mb-4">
              Temukan<br />Izin Anda
            </h1>
            <p className="text-khatulistiwa-200/60 text-lg">
              {allPermits?.length ?? "46"}+ jenis izin tersedia secara digital. Cari, baca persyaratan, lalu ajukan.
            </p>
          </div>

          {/* Search */}
          <div className="mt-8">
            <CommandSearch query={query} setQuery={setQuery} permits={allPermits ?? []} />
          </div>
        </div>

        {/* Curved wave transition to cream */}
        <div className="h-8 relative">
          <svg
            viewBox="0 0 1440 32"
            className="absolute bottom-0 w-full"
            preserveAspectRatio="none"
            style={{ height: "32px" }}
            aria-hidden="true"
          >
            <path d="M0,32 L0,0 Q720,32 1440,0 L1440,32 Z" fill="#F5F0E8" />
          </svg>
        </div>
      </div>

      {/* ── Sticky sektor filter — cream bg ── */}
      <div className="bg-pertiwi-warm sticky top-16 z-20 border-b border-pertiwi-muted">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {[{ key: null, name: "Semua", count: allPermits?.length } as { key: string | null; name: string; count?: number }, ...(sektors ?? []).map((s) => ({ key: s.key, name: s.name, count: permitsBySektor(s.key).length }))].map((s) => {
              const isActive = s.key === activeSektor || (s.key === null && activeSektor === null);
              return (
                <button
                  key={s.key ?? "all"}
                  onClick={() => setActiveSektor(s.key)}
                  className={cn(
                    "flex-shrink-0 rounded-full px-5 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200",
                    isActive
                      ? "bg-khatulistiwa-600 text-white shadow-[0_4px_12px_rgba(24,80,136,0.35)]"
                      : "bg-white text-khatulistiwa-700 border border-pertiwi-muted shadow-sm hover:border-khatulistiwa-300 hover:text-khatulistiwa-600"
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  {s.name}
                  {s.count !== undefined && (
                    <span className={`ml-2 text-xs ${isActive ? "text-white/70" : "text-khatulistiwa-400"}`}>
                      {s.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Catalog grid — cream bg ── */}
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-14">
        <AnimatePresence mode="popLayout">
          {displayedSektor?.map((sektor) => {
            const permits = permitsBySektor(sektor.key);
            if (permits.length === 0) return null;
            const v = getSektorVisual(sektor.key, sektor.name);
            const Icon = v.Icon;
            return (
              <motion.section
                key={sektor.key}
                layout
                id={sektor.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                viewport={{ once: true }}
                aria-labelledby={`sektor-${sektor.key}-heading`}
                className="scroll-mt-32"
              >
                {/* Sektor header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-khatulistiwa-800 flex items-center justify-center shrink-0 shadow-md">
                      <Icon className={`w-6 h-6 ${v.iconText}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2
                        id={`sektor-${sektor.key}-heading`}
                        className="text-khatulistiwa-900 font-display font-black text-2xl truncate"
                      >
                        {sektor.name}
                      </h2>
                      {sektor.pengampu && (
                        <p className="text-khatulistiwa-500/70 text-sm truncate">{sektor.pengampu}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 bg-khatulistiwa-800 text-terakota-300 text-sm font-bold px-4 py-2 rounded-full">
                    {permits.length} layanan
                  </span>
                </div>

                {/* Gradient divider */}
                <div className="h-px bg-gradient-to-r from-khatulistiwa-800/30 via-terakota-500/20 to-transparent mb-6" aria-hidden="true" />

                {/* Permit cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                  {permits.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="h-full"
                    >
                      <PermitCard permit={p} accentClass={v.dot} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>

        {/* Bottom CTA — dark card on cream */}
        <div className="rounded-2xl bg-khatulistiwa-900 p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-khatulistiwa-700 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-terakota-400" aria-hidden="true" />
          </div>
          <p className="text-white font-display font-bold text-lg">Siap mengajukan izin?</p>
          <p className="text-khatulistiwa-300/55 text-sm mt-1.5 max-w-sm mx-auto">
            Masuk atau daftar untuk memulai permohonan dan memantau prosesnya secara real-time.
          </p>
          <div className="flex gap-3 justify-center mt-6 flex-wrap">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-terakota-500 hover:bg-terakota-400
                         text-khatulistiwa-900 px-6 py-3 text-sm font-bold transition-colors
                         shadow-lg shadow-terakota-500/25"
            >
              Daftar Gratis
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06]
                         text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.12] transition-colors"
            >
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
