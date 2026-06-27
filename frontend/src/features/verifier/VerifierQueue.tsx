import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, differenceInHours } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Clock, AlertTriangle, CheckCircle2, RefreshCw, Flame, Inbox, BadgeCheck, Search, X, RotateCcw, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { scrollIntoViewOnFocus } from "@/lib/scrollIntoViewOnFocus";
import Kbd from "@/components/ui/Kbd";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

type BulkAction = "approve" | "request_revision" | "reject";

const BULK_TOAST: Record<BulkAction, string> = {
  approve: "disetujui",
  request_revision: "diminta revisi",
  reject: "ditolak",
};

// Common reasons, offered as one-tap chips to fill the note field.
const NOTE_TEMPLATES: Record<BulkAction, string[]> = {
  approve: [],
  request_revision: [
    "Kualitas pindaian dokumen kurang jelas.",
    "Data tidak sesuai dokumen pendukung.",
    "Mohon lengkapi dokumen yang masih kurang.",
  ],
  reject: [
    "Tidak memenuhi persyaratan.",
    "Dokumen tidak valid atau kedaluwarsa.",
    "Data tidak dapat diverifikasi.",
  ],
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft:      "Draft",
  submitted:  "Baru Masuk",
  in_review:  "Diverifikasi",
  revision:   "Revisi Masuk",
  approved:   "Disetujui",
  rejected:   "Ditolak",
  publishing: "Penerbitan",
  collection: "Siap Diambil",
  collected:  "Selesai",
  issued:     "Diterbitkan",
};

const FILTER_TABS: { label: string; statuses: SubmissionStatus[] }[] = [
  { label: "Semua Aktif", statuses: ["submitted", "in_review", "revision", "publishing"] },
  { label: "Baru Masuk",  statuses: ["submitted", "in_review"] },
  { label: "Revisi",      statuses: ["revision"] },
  { label: "Selesai",     statuses: ["approved", "collected", "issued", "rejected"] },
];

type SLALevel = "breached" | "critical" | "warning" | "ok";

function getSLALevel(dueAt: string | null, breached: boolean): SLALevel {
  if (!dueAt) return "ok";
  if (breached) return "breached";
  const h = differenceInHours(parseISO(dueAt), new Date());
  if (h < 4) return "critical";
  if (h < 24) return "warning";
  return "ok";
}

const SLA_STYLES: Record<SLALevel, { bar: string; bg: string; text: string; Icon: LucideIcon }> = {
  breached: { bar: "bg-red-500",     bg: "ring-red-200",    text: "text-red-600",    Icon: Flame },
  critical: { bar: "bg-red-400",     bg: "ring-red-100",    text: "text-red-500",    Icon: AlertTriangle },
  warning:  { bar: "bg-terakota-500",bg: "ring-terakota-200",text: "text-terakota-700",Icon: Clock },
  ok:       { bar: "bg-khatulistiwa-100", bg: "ring-khatulistiwa-100/60", text: "text-khatulistiwa-500/70", Icon: Clock },
};

export default function VerifierQueue() {
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [slaFilter, setSlaFilter] = useState<"all" | "at_risk" | "breached">("all");
  const [sortBy, setSortBy] = useState<"sla" | "newest" | "applicant">("sla");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<BulkAction | null>(null);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { statuses } = FILTER_TABS[activeTab];

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<PaginatedResponse<Submission>>({
    queryKey: ["verifier-queue", statuses],
    queryFn: () =>
      api.get(`/submissions/?status=${statuses.join(",")}&ordering=sla_due_at`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const submissions = useMemo(() => data?.results ?? [], [data]);
  const breachedCount = submissions.filter((s) => s.is_sla_breached).length;
  const atRiskCount = submissions.filter((s) => !s.is_sla_breached && s.is_sla_at_risk).length;

  // Client-side search + SLA filter + sort across the loaded queue.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = submissions.filter((s) => {
      if (slaFilter === "breached" && !s.is_sla_breached) return false;
      if (slaFilter === "at_risk" && !(s.is_sla_at_risk && !s.is_sla_breached)) return false;
      if (!q) return true;
      return (
        s.permit_type_name?.toLowerCase().includes(q) ||
        s.applicant_name?.toLowerCase().includes(q) ||
        s.reference_number?.toLowerCase().includes(q)
      );
    });
    out = [...out].sort((a, b) => {
      if (sortBy === "newest")
        return (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "");
      if (sortBy === "applicant")
        return (a.applicant_name ?? "").localeCompare(b.applicant_name ?? "");
      // sla: nulls last, soonest first
      return (a.sla_due_at ?? "9999").localeCompare(b.sla_due_at ?? "9999");
    });
    return out;
  }, [submissions, query, slaFilter, sortBy]);

  useEffect(() => {
    setSelected(0);
    setPicked(new Set());
  }, [activeTab, query, slaFilter, sortBy]);

  useEffect(() => setSlaFilter("all"), [activeTab]);

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allVisiblePicked = filtered.length > 0 && filtered.every((s) => picked.has(s.id));
  function togglePickAll() {
    setPicked(allVisiblePicked ? new Set() : new Set(filtered.map((s) => s.id)));
  }

  const noteRequired = bulkType === "request_revision" || bulkType === "reject";

  // Fan the chosen action out across every picked submission; report partials.
  async function runBulk() {
    if (!bulkType) return;
    const ids = [...picked];
    setBulkBusy(true);
    const results = await Promise.allSettled(
      ids.map((id) =>
        api.post(`/submissions/${id}/act/`, { action: bulkType, notes: bulkNote || undefined }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    setBulkBusy(false);
    setBulkType(null);
    setBulkNote("");
    setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["verifier-queue"] });
    if (failed === 0) toast.success(`${ok} permohonan ${BULK_TOAST[bulkType]}.`);
    else toast.warning(`${ok} berhasil, ${failed} gagal (transisi tidak valid?).`);
  }

  // Keyboard triage: j/k or arrows to move, Enter to open, f to find.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (typing) {
        if (e.key === "Escape") (document.activeElement as HTMLElement)?.blur();
        return;
      }
      const cur = filtered[selected];
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault(); setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" && cur) {
        e.preventDefault(); navigate(`/verifier/submissions/${cur.id}`);
      } else if (e.key === "f") {
        e.preventDefault(); searchRef.current?.focus();
      } else if (e.key === "x" && cur) {
        e.preventDefault(); togglePick(cur.id);
      } else if ((e.key === "a" || e.key === "r") && cur) {
        // Act on the current selection set, or the row under the cursor if none picked.
        e.preventDefault();
        setPicked((prev) => (prev.size > 0 ? prev : new Set([cur.id])));
        setBulkType(e.key === "a" ? "approve" : "request_revision");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selected, navigate]);

  useEffect(() => {
    rowRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-khatulistiwa-900">Antrean Verifikasi</h1>
          <p className="text-sm text-khatulistiwa-600/70 mt-0.5">
            {isLoading ? "Memuat…" : `${data?.count ?? 0} permohonan aktif`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dataUpdatedAt > 0 && (
            <span className="hidden sm:inline text-[11px] text-khatulistiwa-400">
              Diperbarui {format(new Date(dataUpdatedAt), "HH:mm", { locale: localeId })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 bg-white border border-khatulistiwa-100 hover:border-khatulistiwa-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-khatulistiwa-700 shadow-sm transition-colors"
            aria-label="Refresh antrean"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Quick stats (at-risk / breached double as filters) ── */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setSlaFilter("all")}
          className={cn(
            "flex flex-col justify-between min-h-[100px] rounded-2xl border bg-white p-4 text-left transition-all",
            slaFilter === "all" ? "border-khatulistiwa-400 ring-2 ring-khatulistiwa-200" : "border-khatulistiwa-100 hover:border-khatulistiwa-300",
          )}
          aria-pressed={slaFilter === "all"}
        >
          <Inbox className="w-5 h-5 text-khatulistiwa-400" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-khatulistiwa-900">{data?.count ?? 0}</p>
            <p className="text-xs text-khatulistiwa-600/70">Total Dalam Kategori</p>
          </div>
        </button>
        <button
          onClick={() => setSlaFilter((f) => (f === "at_risk" ? "all" : "at_risk"))}
          className={cn(
            "flex flex-col justify-between min-h-[100px] rounded-2xl border bg-amber-50 p-4 text-left transition-all",
            slaFilter === "at_risk" ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-200 hover:border-amber-300",
          )}
          aria-pressed={slaFilter === "at_risk"}
        >
          <Clock className="w-5 h-5 text-amber-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-khatulistiwa-900">{atRiskCount}</p>
            <p className="text-xs text-khatulistiwa-600/70">Mendekati SLA</p>
          </div>
        </button>
        <button
          onClick={() => setSlaFilter((f) => (f === "breached" ? "all" : "breached"))}
          className={cn(
            "flex flex-col justify-between min-h-[100px] rounded-2xl border bg-red-50 p-4 text-left transition-all",
            slaFilter === "breached" ? "border-red-400 ring-2 ring-red-200" : "border-red-200 hover:border-red-300",
          )}
          aria-pressed={slaFilter === "breached"}
        >
          <Flame className="w-5 h-5 text-red-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-khatulistiwa-900">{breachedCount}</p>
            <p className="text-xs text-khatulistiwa-600/70">SLA Terlampaui</p>
          </div>
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 bg-white border border-khatulistiwa-100 shadow-sm rounded-xl p-1">
        {FILTER_TABS.map(({ label }, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
              i === activeTab
                ? "bg-khatulistiwa-800 text-white shadow-sm"
                : "text-khatulistiwa-600/70 hover:text-khatulistiwa-900 hover:bg-khatulistiwa-50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search + keyboard hint ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-white border border-khatulistiwa-100 rounded-xl px-3.5 py-2.5 focus-within:border-khatulistiwa-300 transition-colors">
          <Search className="w-4 h-4 text-khatulistiwa-400 shrink-0" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={scrollIntoViewOnFocus}
            placeholder="Cari nomor, pemohon, atau jenis izin…"
            className="flex-1 bg-transparent text-sm text-khatulistiwa-900 placeholder-khatulistiwa-400/60 outline-none"
            aria-label="Cari dalam antrean"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-khatulistiwa-400 hover:text-khatulistiwa-700" aria-label="Hapus pencarian">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 bg-white border border-khatulistiwa-100 rounded-xl px-3 py-2.5 text-xs text-khatulistiwa-600">
          <span className="text-khatulistiwa-400">Urutkan</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent font-semibold text-khatulistiwa-800 outline-none cursor-pointer"
            aria-label="Urutkan antrean"
          >
            <option value="sla">SLA terdekat</option>
            <option value="newest">Terbaru diajukan</option>
            <option value="applicant">Nama pemohon</option>
          </select>
        </label>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-khatulistiwa-400">
          <span className="flex items-center gap-1"><Kbd>j</Kbd><Kbd>k</Kbd> pilih</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> buka</span>
          <span className="flex items-center gap-1"><Kbd>x</Kbd> tandai</span>
          <span className="flex items-center gap-1"><Kbd>a</Kbd> setujui</span>
          <span className="flex items-center gap-1"><Kbd>r</Kbd> revisi</span>
          <span className="flex items-center gap-1"><Kbd>f</Kbd> cari</span>
        </div>
      </div>

      {/* ── Select-all ── */}
      {!isLoading && filtered.length > 0 && (
        <label className="flex items-center gap-2 px-1 text-xs font-semibold text-khatulistiwa-600/80 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={allVisiblePicked}
            onChange={togglePickAll}
            className="h-4 w-4 rounded border-khatulistiwa-300 text-khatulistiwa-600 focus:ring-khatulistiwa-500"
          />
          {picked.size > 0 ? `${picked.size} dipilih` : "Pilih semua"}
        </label>
      )}

      {/* ── Cards ── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-white animate-pulse border border-khatulistiwa-100" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-khatulistiwa-100 rounded-2xl p-12 text-center space-y-3"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" aria-hidden="true" />
          <p className="font-semibold text-khatulistiwa-900">{query ? "Tidak ada hasil" : "Antrean kosong"}</p>
          <p className="text-sm text-khatulistiwa-600/70">
            {query ? "Coba kata kunci lain." : "Tidak ada permohonan dalam kategori ini."}
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="space-y-2">
          {filtered.map((sub, i) => {
            const level = getSLALevel(sub.sla_due_at, sub.is_sla_breached);
            const sla = SLA_STYLES[level];
            const hoursLeft = sub.sla_due_at
              ? differenceInHours(parseISO(sub.sla_due_at), new Date())
              : null;

            return (
              <motion.div
                key={sub.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                className="flex items-stretch gap-2"
              >
                <label
                  className="flex items-center pl-0.5 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={picked.has(sub.id)}
                    onChange={() => togglePick(sub.id)}
                    className="h-4 w-4 rounded border-khatulistiwa-300 text-khatulistiwa-600 focus:ring-khatulistiwa-500"
                    aria-label={`Pilih ${sub.reference_number}`}
                  />
                </label>
                <Link
                  ref={(el) => { rowRefs.current[i] = el; }}
                  to={`/verifier/submissions/${sub.id}`}
                  onMouseEnter={() => setSelected(i)}
                  className={cn(
                    "group flex flex-1 gap-0 rounded-2xl overflow-hidden border transition-all duration-150",
                    "bg-white hover:shadow-md",
                    picked.has(sub.id)
                      ? "ring-2 ring-khatulistiwa-400 border-transparent"
                      : i === selected
                      ? "ring-2 ring-khatulistiwa-500 ring-offset-1 ring-offset-pertiwi-warm border-transparent shadow-md"
                      : level !== "ok" ? cn("border-khatulistiwa-100", sla.bg) : "border-khatulistiwa-100"
                  )}
                >
                  {/* SLA color bar */}
                  <div className={cn("w-1 shrink-0", sla.bar)} />

                  {/* Content */}
                  <div className="flex-1 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-khatulistiwa-900">{sub.permit_type_name}</p>
                          <span className="text-[11px] text-khatulistiwa-600/70 bg-khatulistiwa-50 px-2 py-0.5 rounded-full font-medium">
                            {STATUS_LABEL[sub.status]}
                          </span>
                        </div>
                        <p className="text-xs text-khatulistiwa-600/70 mt-1">
                          <span className="font-medium text-khatulistiwa-800">{sub.applicant_name}</span>
                          {" · "}
                          {sub.reference_number}
                        </p>
                      </div>

                      {/* SLA indicator */}
                      {sub.sla_due_at && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-semibold shrink-0",
                          sla.text,
                          level === "breached" && "animate-pulse"
                        )}>
                          <sla.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {sub.is_sla_breached
                            ? "SLA Terlampaui"
                            : hoursLeft !== null && hoursLeft < 24
                            ? `${hoursLeft}j tersisa`
                            : format(parseISO(sub.sla_due_at), "d MMM", { locale: localeId })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-[11px] text-khatulistiwa-400/70">
                        Diajukan:{" "}
                        {sub.submitted_at
                          ? format(parseISO(sub.submitted_at), "d MMM yyyy · HH:mm", { locale: localeId })
                          : "—"}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-khatulistiwa-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        Buka
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* ── Sticky bulk action bar ── */}
      <AnimatePresence>
        {picked.size > 0 && !bulkType && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex w-[calc(100vw-1.5rem)] max-w-md items-center gap-2 overflow-x-auto rounded-2xl border border-khatulistiwa-200 bg-white px-3 py-2 shadow-xl sm:w-auto"
          >
            <span className="px-1 text-sm font-semibold text-khatulistiwa-900 shrink-0">{picked.size} dipilih</span>
            <button
              onClick={() => setBulkType("approve")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Setujui
            </button>
            <button
              onClick={() => setBulkType("request_revision")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Revisi
            </button>
            <button
              onClick={() => setBulkType("reject")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" /> Tolak
            </button>
            <button
              onClick={() => setPicked(new Set())}
              className="shrink-0 ml-1 text-khatulistiwa-400 hover:text-khatulistiwa-700 px-1"
              aria-label="Batalkan pilihan"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk note modal ── */}
      <AnimatePresence>
        {bulkType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-khatulistiwa-950/40 p-4"
            onClick={() => !bulkBusy && setBulkType(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display font-bold text-base text-khatulistiwa-900">
                {bulkType === "approve" ? "Setujui" : bulkType === "request_revision" ? "Minta Revisi" : "Tolak"}{" "}
                {picked.size} permohonan
              </h2>
              <p className="text-xs text-khatulistiwa-600/70">
                Tindakan ini diterapkan ke semua permohonan terpilih. Permohonan yang transisinya tidak
                valid akan dilewati.
              </p>
              {NOTE_TEMPLATES[bulkType].length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_TEMPLATES[bulkType].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBulkNote(t)}
                      className="rounded-full border border-khatulistiwa-200 bg-khatulistiwa-50 px-2.5 py-1 text-[11px] font-medium text-khatulistiwa-700 hover:bg-khatulistiwa-100 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                rows={3}
                placeholder={noteRequired ? "Catatan (wajib)…" : "Catatan (opsional)…"}
                className="w-full bg-khatulistiwa-50/50 border border-khatulistiwa-100 rounded-xl px-4 py-3 text-khatulistiwa-900 placeholder-khatulistiwa-300 text-sm outline-none resize-none focus:bg-white focus:border-khatulistiwa-400 focus:ring-2 focus:ring-khatulistiwa-400/15 transition-all"
                aria-label="Catatan tindakan massal"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkType(null)}
                  disabled={bulkBusy}
                  className="flex-1 rounded-xl border border-khatulistiwa-200 py-2.5 text-sm font-semibold text-khatulistiwa-700 hover:bg-khatulistiwa-50 transition-colors disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  onClick={runBulk}
                  disabled={bulkBusy || (noteRequired && !bulkNote.trim())}
                  className="flex-1 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {bulkBusy ? "Memproses…" : "Konfirmasi"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
