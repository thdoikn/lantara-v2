import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Search, ArrowLeft, ChevronRight, Clock, FileText } from "lucide-react";
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
          p.sektor_name.toLowerCase().includes(query.toLowerCase()) ||
          p.product_name?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      navigate(`/portal/new/${results[selected].key}`);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  useEffect(() => setSelected(0), [query]);

  // Global "/" shortcut
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-buana" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari layanan izin… (tekan / untuk fokus)"
          className="w-full rounded-2xl border border-border bg-white pl-12 pr-5 py-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-khatulistiwa placeholder:text-buana"
          aria-label="Cari layanan"
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-block text-xs text-buana bg-muted px-1.5 py-0.5 rounded border border-border">
          /
        </kbd>
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.ul
            id="search-results"
            role="listbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-white shadow-xl overflow-hidden"
          >
            {results.slice(0, 8).map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === selected}>
                <Link
                  to={`/portal/new/${p.key}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors",
                    i === selected && "bg-muted"
                  )}
                >
                  <FileText className="h-4 w-4 text-buana shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-buana">{p.sektor_name}</p>
                  </div>
                  <span className="text-xs text-buana shrink-0">{p.sla_days}h kerja</span>
                  <ChevronRight className="h-4 w-4 text-buana shrink-0" />
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
      className="group block rounded-xl border border-border bg-white p-4 hover:border-jagawana/40 hover:shadow-sm transition-all"
    >
      <p className="font-medium text-sm group-hover:text-jagawana transition-colors">
        {permit.name}
      </p>
      <p className="text-xs text-buana mt-1 line-clamp-2">{permit.product_name}</p>
      <div className="flex items-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-xs text-buana">
          <Clock className="h-3.5 w-3.5" />
          {permit.sla_days} hari kerja
        </span>
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ServiceCatalog() {
  const [query, setQuery] = useState("");
  const [activeSektor, setActiveSektor] = useState<string | null>(null);

  const { data: sektors } = useQuery<Sektor[]>({
    queryKey: ["sektors"],
    queryFn: () => api.get("/sektors/").then((r) => r.data.results ?? r.data),
  });

  const { data: allPermits } = useQuery<PermitType[]>({
    queryKey: ["permit-types", "all"],
    queryFn: () =>
      api.get("/permit-types/?page_size=200").then((r) => r.data.results ?? r.data),
  });

  const displayedSektor = activeSektor
    ? sektors?.filter((s) => s.key === activeSektor)
    : sektors;

  const permitsBySektork = (sektorKey: string) =>
    (allPermits ?? []).filter((p) => p.sektor_key === sektorKey);

  return (
    <main id="main-content" className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-buana-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6 transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Beranda
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
            Katalog Layanan Perizinan
          </h1>
          <p className="text-white/70 mb-8 max-w-xl">
            Temukan dan ajukan izin yang Anda butuhkan. Semua proses 100% online.
          </p>
          <ServiceCatalogSearch query={query} setQuery={setQuery} allPermits={allPermits ?? []} />
        </div>
      </div>

      {/* Sektor filter chips */}
      <div className="sticky top-0 z-20 bg-white border-b border-border overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 w-max min-w-full">
          <button
            onClick={() => setActiveSektor(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              !activeSektor
                ? "bg-jagawana text-white"
                : "bg-muted text-buana-dark hover:bg-border"
            )}
          >
            Semua
          </button>
          {sektors?.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSektor(s.key === activeSektor ? null : s.key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                s.key === activeSektor
                  ? "bg-jagawana text-white"
                  : "bg-muted text-buana-dark hover:bg-border"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog grid */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {displayedSektor?.map((sektor) => {
          const permits = permitsBySektork(sektor.key);
          if (permits.length === 0) return null;
          return (
            <motion.section
              key={sektor.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-xs text-buana uppercase tracking-widest mb-1">Sektor</p>
                  <h2 className="font-display text-xl font-bold">{sektor.name}</h2>
                  {sektor.pengampu && (
                    <p className="text-sm text-buana mt-0.5">Pengampu: {sektor.pengampu}</p>
                  )}
                </div>
                <span className="text-sm text-buana">{permits.length} layanan</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {permits.map((p) => (
                  <PermitCard key={p.id} permit={p} />
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </main>
  );
}

// alias for use inside component before definition
function ServiceCatalogSearch({
  query,
  setQuery,
  allPermits,
}: {
  query: string;
  setQuery: (q: string) => void;
  allPermits: PermitType[];
}) {
  return <CommandSearch query={query} setQuery={setQuery} permits={allPermits} />;
}
