import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import BatangBanyu from "@/components/BatangBanyu";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search, ChevronRight, Clock, Building2, X,
  ExternalLink, SearchX,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth";
import { scrollIntoViewOnFocus } from "@/lib/scrollIntoViewOnFocus";
import { getSektorVisual } from "@/lib/sektorVisuals";
import type { Sektor, PermitType } from "@/types";

// ── Search match helper ─────────────────────────────────────────────────────────

function matchesQuery(p: PermitType, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    p.name.toLowerCase().includes(needle) ||
    (p.sektor_name?.toLowerCase().includes(needle) ?? false) ||
    (p.product_name?.toLowerCase().includes(needle) ?? false) ||
    p.key.toLowerCase().includes(needle)
  );
}

// ── Permit card ─────────────────────────────────────────────────────────────────

function PermitCard({
  permit,
  accentClass,
  showSektor = false,
}: {
  permit: PermitType;
  accentClass: string;
  showSektor?: boolean;
}) {
  return (
    <Link
      to={`/layanan/${permit.key}`}
      className="group flex flex-col h-full bg-white rounded-2xl border border-pertiwi-muted
                 shadow-sm hover:shadow-lg hover:border-khatulistiwa-300 hover:-translate-y-1
                 transition-all duration-200 overflow-hidden
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-khatulistiwa-500 focus-visible:ring-offset-2 focus-visible:ring-offset-pertiwi-warm"
    >
      {/* Sektor accent bar */}
      <div className={`h-1 w-full shrink-0 ${accentClass}`} aria-hidden="true" />

      <div className="p-5 flex flex-col flex-1">
        {showSektor && (
          <p className="text-khatulistiwa-500/70 text-[11px] font-semibold uppercase tracking-wide mb-1.5">
            {permit.sektor_name}
          </p>
        )}
        <h4 className="text-khatulistiwa-900 font-display font-semibold text-base leading-snug">
          {permit.name}
        </h4>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-khatulistiwa-500/70 text-xs">
            <Clock className="w-3.5 h-3.5 shrink-0 text-khatulistiwa-400/70" aria-hidden="true" />
            {permit.sla_days} hari kerja
          </span>
          {permit.oss_covered && (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              <ExternalLink className="w-3 h-3" aria-hidden="true" /> via OSS
            </span>
          )}
        </div>

        <div className="flex items-center justify-end mt-4 pt-3 border-t border-pertiwi-muted">
          <span className="text-khatulistiwa-600 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            {permit.oss_covered ? "Lihat detail" : "Pelajari"}
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeletons ────────────────────────────────────────────────────────────────────

function CatalogSkeleton() {
  return (
    <div className="space-y-12" aria-hidden="true">
      {[0, 1].map((s) => (
        <div key={s}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-khatulistiwa-100 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-khatulistiwa-100 animate-pulse" />
              <div className="h-3 w-32 rounded bg-khatulistiwa-100/70 animate-pulse" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((c) => (
              <div key={c} className="bg-white rounded-2xl border border-pertiwi-muted p-5 space-y-3">
                <div className="h-4 w-3/4 rounded bg-khatulistiwa-100 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-khatulistiwa-100/70 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-khatulistiwa-100/70 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // URL is the source of truth → search from the landing hero (?q=) lands here
  // pre-filled, and results are shareable / back-button friendly.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [activeSektor, setActiveSektor] = useState<string | null>(
    () => searchParams.get("sektor") ?? null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Write state through to the URL (replace → no history spam while typing).
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    query.trim() ? next.set("q", query.trim()) : next.delete("q");
    activeSektor ? next.set("sektor", activeSektor) : next.delete("sektor");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeSektor]);

  // Global "/" focuses search.
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

  const { data: sektors, isLoading: sektorsLoading } = useQuery<Sektor[]>({
    queryKey: ["sektors"],
    queryFn: () => api.get("/sektors/").then((r) => r.data.results ?? r.data),
  });

  const { data: allPermits, isLoading: permitsLoading } = useQuery<PermitType[]>({
    queryKey: ["permit-types", "all"],
    queryFn: () => api.get("/permit-types/?page_size=200").then((r) => r.data.results ?? r.data),
  });

  const isLoading = sektorsLoading || permitsLoading;
  const q = query.trim();
  const isSearching = q.length > 0;

  // Permits respecting BOTH the active sektor filter and the search term.
  const filtered = useMemo(
    () =>
      (allPermits ?? []).filter(
        (p) =>
          (!activeSektor || p.sektor_key === activeSektor) && matchesQuery(p, q),
      ),
    [allPermits, activeSektor, q],
  );

  const sektorVisible = activeSektor
    ? sektors?.filter((s) => s.key === activeSektor)
    : sektors;

  const permitsBySektor = (sektorKey: string) =>
    filtered.filter((p) => p.sektor_key === sektorKey);

  // Enter → jump straight to the first match (fast path for keyboard users).
  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && filtered[0]) navigate(`/layanan/${filtered[0].key}`);
    else if (e.key === "Escape") setQuery("");
  }

  function resetFilters() {
    setQuery("");
    setActiveSektor(null);
  }

  const total = allPermits?.length;

  return (
    <main id="main-content" className="min-h-screen bg-pertiwi-warm">
      <PublicNav />

      {/* ── Dark hero header ── */}
      <div className="relative overflow-hidden bg-gradient-hero">
        {/* Batang banyu identity texture (matches landing) */}
        <BatangBanyu variant="fill" opacity={0.05} className="text-terakota-400" />
        {/* Decorative ring watermark */}
        <div className="absolute -right-20 -top-20 w-96 h-96 opacity-[0.04] pointer-events-none" aria-hidden="true">
          <div className="w-full h-full rounded-full border-[40px] border-terakota-500" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 pt-28 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-khatulistiwa-300/50 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-terakota-400 transition-colors">Lantara</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/60">Katalog Layanan</span>
          </nav>

          <div className="max-w-2xl">
            <p className="text-terakota-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
              KATALOG LAYANAN
            </p>
            <h1 className="text-white font-display font-black text-5xl md:text-6xl leading-tight mb-4">
              Temukan<br />Izin Anda
            </h1>
            <p className="text-khatulistiwa-200/60 text-lg">
              {total ? `${total} ` : ""}jenis izin tersedia secara digital. Cari, baca persyaratan, lalu ajukan.
            </p>
          </div>

          {/* Search */}
          <div className="mt-8 relative max-w-2xl">
            <div
              role="combobox"
              aria-expanded={isSearching}
              aria-haspopup="grid"
              className="flex items-center bg-white/[0.08] border border-white/[0.15] rounded-2xl px-5 py-4 gap-3
                         focus-within:border-terakota-400/60 focus-within:bg-white/[0.12] transition-all"
            >
              <Search className="w-5 h-5 text-white/40 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                onFocus={scrollIntoViewOnFocus}
                placeholder="Cari nama izin, sektor, atau produk…"
                className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
                aria-label="Cari layanan perizinan"
              />
              {query ? (
                <button
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="text-white/40 hover:text-white transition-colors shrink-0"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="text-white/20 text-xs border border-white/10 px-2 py-1 rounded-md font-mono shrink-0">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>

        {/* Curved wave transition to cream — tokenized via currentColor */}
        <div className="h-8 relative text-pertiwi-warm" aria-hidden="true">
          <svg viewBox="0 0 1440 32" className="absolute bottom-0 w-full" preserveAspectRatio="none" style={{ height: "32px" }}>
            <path d="M0,32 L0,0 Q720,32 1440,0 L1440,32 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── Sticky sektor filter ── */}
      <div className="bg-pertiwi-warm sticky top-16 z-20 border-b border-pertiwi-muted">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {isLoading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-28 rounded-full bg-khatulistiwa-100 animate-pulse shrink-0" aria-hidden="true" />
              ))
            ) : (
              [
                { key: null, name: "Semua", count: allPermits?.length } as { key: string | null; name: string; count?: number },
                ...(sektors ?? []).map((s) => ({
                  key: s.key,
                  name: s.name,
                  count: (allPermits ?? []).filter((p) => p.sektor_key === s.key).length,
                })),
              ].map((s) => {
                const isActive = s.key === activeSektor || (s.key === null && activeSektor === null);
                return (
                  <button
                    key={s.key ?? "all"}
                    onClick={() => setActiveSektor(s.key)}
                    className={cn(
                      "flex-shrink-0 rounded-full px-5 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200",
                      isActive
                        ? "bg-khatulistiwa-600 text-white shadow-[0_4px_12px_rgba(24,80,136,0.35)]"
                        : "bg-white text-khatulistiwa-700 border border-pertiwi-muted shadow-sm hover:border-khatulistiwa-300 hover:text-khatulistiwa-600",
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
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Catalog body ── */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Result count — announced to screen readers */}
        {!isLoading && (isSearching || activeSektor) && (
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8" aria-live="polite">
            <p className="text-khatulistiwa-700 text-sm">
              <span className="font-bold">{filtered.length}</span> izin
              {isSearching && <> untuk "<span className="font-semibold">{q}</span>"</>}
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-khatulistiwa-600 hover:text-khatulistiwa-800 text-sm font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Reset filter
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <CatalogSkeleton />
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-khatulistiwa-100 flex items-center justify-center mb-5">
              <SearchX className="h-8 w-8 text-khatulistiwa-400" aria-hidden="true" />
            </div>
            <h2 className="text-khatulistiwa-900 font-display font-bold text-xl">Tidak ada izin yang cocok</h2>
            <p className="text-khatulistiwa-500/70 text-sm mt-2 max-w-sm mx-auto">
              Coba kata kunci lain atau hapus filter untuk melihat seluruh katalog.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white px-6 py-3 text-sm font-semibold transition-colors"
            >
              Lihat Semua Izin
            </button>
          </div>
        ) : isSearching ? (
          /* Flat search results — sektor shown on each card */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {filtered.map((p, i) => {
              const v = getSektorVisual(p.sektor_key, p.sektor_name);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  className="h-full"
                >
                  <PermitCard permit={p} accentClass={v.dot} showSektor />
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Grouped browse view */
          <div className="space-y-14">
            {sektorVisible?.map((sektor) => {
              const permits = permitsBySektor(sektor.key);
              if (permits.length === 0) return null;
              const v = getSektorVisual(sektor.key, sektor.name);
              const Icon = v.Icon;
              return (
                <section
                  key={sektor.key}
                  id={sektor.key}
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
                        {(sektor.pengampu_display || sektor.pengampu) && (
                          <p className="text-khatulistiwa-500/70 text-sm truncate">
                            {sektor.pengampu_display || sektor.pengampu}
                          </p>
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
                </section>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-khatulistiwa-900 p-8 text-center mt-14">
          <div className="mx-auto h-12 w-12 rounded-xl bg-khatulistiwa-700 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-terakota-400" aria-hidden="true" />
          </div>
          <p className="text-white font-display font-bold text-lg">Siap mengajukan izin?</p>
          <p className="text-khatulistiwa-300/55 text-sm mt-1.5 max-w-sm mx-auto">
            {isAuthenticated
              ? "Buka portal pemohon untuk memulai permohonan dan memantau prosesnya secara real-time."
              : "Masuk atau daftar untuk memulai permohonan dan memantau prosesnya secara real-time."}
          </p>
          <div className="flex gap-3 justify-center mt-6 flex-wrap">
            {isAuthenticated ? (
              <Link
                to="/portal"
                className="inline-flex items-center gap-2 rounded-xl bg-terakota-500 hover:bg-terakota-400
                           text-khatulistiwa-900 px-6 py-3 text-sm font-bold transition-colors
                           shadow-lg shadow-terakota-500/25"
              >
                Buka Portal Pemohon
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
