import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Search, ArrowLeft, ChevronRight, Clock, FileText, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari layanan izin… (tekan / untuk fokus)"
          className="w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 pl-12 pr-16 py-4
                     text-base text-white placeholder:text-white/35 focus:outline-none
                     focus:ring-2 focus:ring-jagawana/60 focus:bg-white/15 transition-all"
          aria-label="Cari layanan perizinan"
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center
                        text-xs text-white/40 bg-white/10 w-6 h-6 rounded border border-white/15">
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
            className="absolute z-50 mt-2 w-full rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-floating overflow-hidden"
          >
            {results.slice(0, 8).map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === selected}>
                <Link
                  to={`/portal/new/${p.key}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    i === selected ? "bg-muted" : "hover:bg-muted"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-jagawana/10 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-jagawana" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-buana">{p.sektor_name}</p>
                  </div>
                  <span className="text-xs text-buana shrink-0 font-medium">{p.sla_days}h kerja</span>
                  <ChevronRight className="h-4 w-4 text-buana shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Permit card ───────────────────────────────────────────────────────────────

function PermitCard({ permit }: { permit: PermitType }) {
  return (
    <Link
      to={`/portal/new/${permit.key}`}
      className="group card-hover p-5 block"
    >
      <p className="font-semibold text-sm text-foreground group-hover:text-jagawana transition-colors line-clamp-2">
        {permit.name}
      </p>
      {permit.product_name && (
        <p className="text-xs text-buana mt-1.5 line-clamp-2 leading-relaxed">{permit.product_name}</p>
      )}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
        <span className="flex items-center gap-1 text-xs text-buana font-medium">
          <Clock className="h-3 w-3 text-buana/60" aria-hidden="true" />
          {permit.sla_days} hari kerja
        </span>
        <span className="ml-auto text-xs text-khatulistiwa font-semibold
                         opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Ajukan
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
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
    <main id="main-content" className="min-h-screen bg-background">
      {/* ── Rich header ── */}
      <div className="relative overflow-hidden bg-gradient-auth">
        <div className="absolute top-[-80px] right-[-80px] h-[400px] w-[400px] rounded-full
                        bg-jagawana/12 blur-[120px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-[-40px] left-0 h-[200px] w-[300px] rounded-full
                        bg-khatulistiwa/8 blur-[80px] pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 dot-grid opacity-[0.05] text-white pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-7 transition-colors"
          >
            <Leaf className="h-4 w-4 text-jagawana" aria-hidden="true" />
            <span className="font-bold text-jagawana/90">Lantara</span>
            <span className="text-white/30 mx-1">/</span>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Beranda
          </Link>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white mb-3">
            Katalog Layanan
          </h1>
          <p className="text-white/55 mb-8 max-w-lg text-base sm:text-lg">
            {allPermits?.length ?? "31"}+ jenis izin tersedia secara digital.
            Temukan dan ajukan sekarang.
          </p>

          <CommandSearch query={query} setQuery={setQuery} permits={allPermits ?? []} />
        </div>

        {/* Bottom fade */}
        <div className="h-8 bg-gradient-to-b from-transparent to-background" aria-hidden="true" />
      </div>

      {/* ── Sticky sektor filter ── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border/70">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex gap-1.5 overflow-x-auto
                        scrollbar-hide [&::-webkit-scrollbar]:hidden">
          {[{ key: null, name: "Semua", permit_count: allPermits?.length ?? 0 },
            ...(sektors ?? [])].map((s) => (
            <button
              key={s.key ?? "all"}
              onClick={() => setActiveSektor(s.key)}
              className={cn(
                "flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150",
                s.key === activeSektor || (s.key === null && activeSektor === null)
                  ? "bg-buana-dark text-white shadow-sm"
                  : "bg-muted text-buana-dark hover:bg-border/80"
              )}
              aria-current={
                (s.key === activeSektor || (s.key === null && activeSektor === null))
                  ? "true" : undefined
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Catalog grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        <AnimatePresence mode="popLayout">
          {displayedSektor?.map((sektor) => {
            const permits = permitsBySektor(sektor.key);
            if (permits.length === 0) return null;
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
              >
                <div className="flex items-end justify-between mb-5 pb-3 border-b border-border/60">
                  <div>
                    <p className="section-label mb-1.5">Sektor</p>
                    <h2 id={`sektor-${sektor.key}-heading`} className="font-display text-xl font-bold">
                      {sektor.name}
                    </h2>
                    {sektor.pengampu && (
                      <p className="text-xs text-buana mt-0.5">Pengampu: {sektor.pengampu}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-buana bg-muted px-3 py-1 rounded-full">
                    {permits.length} layanan
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {permits.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <PermitCard permit={p} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>
      </div>
    </main>
  );
}
