import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Search, ArrowLeft, ChevronRight, Clock, FileText, Building2 } from "lucide-react";
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
    else if (e.key === "Enter" && results[selected]) navigate(`/portal/new/${results[selected].key}`);
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
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200/40" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari layanan izin… (tekan / untuk fokus)"
          className="w-full rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] pl-12 pr-16 py-4
                     text-base text-white placeholder:text-blue-200/35 focus:outline-none
                     focus:ring-2 focus:ring-blue-500/60 focus:bg-white/[0.10] transition-all"
          aria-label="Cari layanan perizinan"
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center
                        text-xs text-blue-200/40 bg-white/[0.08] w-6 h-6 rounded border border-white/[0.12]">
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
            className="absolute z-50 mt-2 w-full rounded-2xl bg-[#0B1B3E] ring-1 ring-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {results.slice(0, 8).map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === selected}>
                <Link
                  to={`/portal/new/${p.key}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    i === selected ? "bg-white/[0.06]" : "hover:bg-white/[0.06]"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-blue-200/50">{p.sektor_name}</p>
                  </div>
                  <span className="text-xs text-blue-200/50 shrink-0 font-medium">{p.sla_days}h kerja</span>
                  <ChevronRight className="h-4 w-4 text-blue-200/40 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Permit card (dark glass, equal height) ─────────────────────────────────────

function PermitCard({ permit, accent }: { permit: PermitType; accent: ReturnType<typeof getSektorVisual> }) {
  return (
    <Link
      to={`/portal/new/${permit.key}`}
      className={cn(
        "group relative overflow-hidden flex flex-col h-full rounded-2xl p-5",
        "bg-white/[0.04] border border-white/[0.08]",
        "hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-1",
        "hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out",
        "before:content-[''] before:absolute before:top-0 before:left-5 before:right-5 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:to-transparent",
        accent.via
      )}
    >
      <p className="font-semibold text-[15px] text-white group-hover:text-blue-200 transition-colors line-clamp-2">
        {permit.name}
      </p>
      {permit.product_name && (
        <p className="text-xs text-blue-200/50 mt-1.5 line-clamp-2 leading-relaxed">{permit.product_name}</p>
      )}

      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/[0.07]">
        <span className="flex items-center gap-1.5 text-xs text-blue-200/55 font-medium">
          <Clock className="h-3.5 w-3.5 text-blue-200/40" aria-hidden="true" />
          {permit.sla_days} hari kerja
        </span>
        <span className={cn("ml-auto text-xs font-semibold inline-flex items-center gap-1", accent.link)}>
          Ajukan
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </span>
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
    <main id="main-content" className="min-h-screen bg-[#0B1B3E]">
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-[#0B1B3E]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% -10%, #1A3480 0%, transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 dot-grid opacity-[0.04] text-white pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-24 pb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-blue-200/50 hover:text-white mb-7 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-bold text-gold-300/90">Lantara</span>
            <span className="text-white/25 mx-0.5">/</span>
            Beranda
          </Link>

          <p className="text-[#D4A017] text-xs font-bold tracking-[0.2em] uppercase mb-3">Katalog Layanan</p>
          <h1 className="font-display font-black text-white text-4xl md:text-5xl mb-3">
            Temukan Izin Anda
          </h1>
          <p className="text-blue-200/60 mb-8 max-w-lg text-base sm:text-lg">
            {allPermits?.length ?? "31"}+ jenis izin tersedia secara digital. Cari, baca persyaratan, lalu ajukan.
          </p>

          <CommandSearch query={query} setQuery={setQuery} permits={allPermits ?? []} />
        </div>
      </div>

      {/* ── Sticky sektor filter ── */}
      <div className="sticky top-0 z-20 bg-[#0B1B3E]/90 backdrop-blur-md border-y border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {[{ key: null, name: "Semua" }, ...(sektors ?? [])].map((s) => {
            const isActive = s.key === activeSektor || (s.key === null && activeSektor === null);
            return (
              <button
                key={s.key ?? "all"}
                onClick={() => setActiveSektor(s.key)}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
                  isActive
                    ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                    : "bg-white/[0.04] text-blue-200/70 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                )}
                aria-current={isActive ? "true" : undefined}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Catalog grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
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
                className="scroll-mt-24"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("rounded-xl w-12 h-12 flex items-center justify-center ring-1 ring-white/10 shrink-0", v.iconWrap)}>
                    <Icon className={cn("h-5 w-5", v.iconText)} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 id={`sektor-${sektor.key}-heading`} className="font-display text-xl font-bold text-white truncate">
                      {sektor.name}
                    </h2>
                    {sektor.pengampu && (
                      <p className="text-xs text-blue-200/50 truncate">{sektor.pengampu}</p>
                    )}
                  </div>
                  <span className={cn("ml-auto shrink-0 text-xs font-bold px-3 py-1 rounded-full", v.badge)}>
                    {permits.length} layanan
                  </span>
                </div>

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
                      <PermitCard permit={p} accent={v} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>

        {/* Empty / register prompt */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-blue-300" aria-hidden="true" />
          </div>
          <p className="text-white font-display font-bold text-lg">Siap mengajukan izin?</p>
          <p className="text-blue-200/55 text-sm mt-1.5 max-w-sm mx-auto">
            Masuk atau daftar untuk memulai permohonan dan memantau prosesnya secara real-time.
          </p>
          <div className="flex gap-3 justify-center mt-6 flex-wrap">
            <Link to="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 text-sm font-semibold transition-colors">
              Daftar Gratis
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/auth/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.12] transition-colors">
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
