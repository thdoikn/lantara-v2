import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format, parseISO, formatDistanceToNow, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Circle, Clock, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Submission, AuditEntry } from "@/types";
import DocumentUploadSection from "./DocumentUploadSection";

// ── Status badge (standardised) ──────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft:      { label: "Draft",        classes: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted:  { label: "Diajukan",     classes: "bg-khatulistiwa-100 text-khatulistiwa-700 border-khatulistiwa-200" },
  in_review:  { label: "Ditinjau",     classes: "bg-amber-100 text-amber-700 border-amber-200" },
  revision:   { label: "Revisi",       classes: "bg-orange-100 text-orange-700 border-orange-200" },
  approved:   { label: "Disetujui",    classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected:   { label: "Ditolak",      classes: "bg-red-100 text-red-700 border-red-200" },
  publishing: { label: "Penerbitan",   classes: "bg-khatulistiwa-100 text-khatulistiwa-700 border-khatulistiwa-200" },
  collection: { label: "Siap Diambil", classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  collected:  { label: "Selesai",      classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  issued:     { label: "Diterbitkan",  classes: "bg-emerald-600 text-white border-emerald-700" },
};

function StatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={cn(
      "inline-flex items-center border font-semibold rounded-full",
      large ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs",
      cfg.classes
    )}>
      {cfg.label}
    </span>
  );
}

// ── SLA countdown ───────────────────────────────────────────────────────────

function SLACountdown({ dueAt, breached }: { dueAt: string; breached: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const due = parseISO(dueAt);
  const overdue = isPast(due);

  return (
    <span className={cn(
      "flex items-center gap-1.5 text-xs font-semibold",
      breached || overdue ? "text-red-500" : "text-amber-600"
    )}>
      {breached || overdue
        ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        : <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      }
      {overdue
        ? `Terlampaui ${formatDistanceToNow(due, { locale: localeId })}`
        : `Batas: ${formatDistanceToNow(due, { addSuffix: true, locale: localeId })}`
      }
    </span>
  );
}

// ── Stage tracker ────────────────────────────────────────────────────────────

interface StageRow {
  key: string;
  name: string;
  order: number;
}

function DrawnCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
      strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4 4L19 7" className="animate-draw" style={{ ["--len" as string]: "24" }} />
    </svg>
  );
}

const trackerList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};
const trackerRow = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

function StageTracker({
  stages,
  currentKey,
  status,
  auditEntries,
}: {
  stages: StageRow[];
  currentKey: string;
  status: string;
  auditEntries: AuditEntry[];
}) {
  const terminalDone = status === "issued" || status === "rejected";
  const currentOrder = stages.find((s) => s.key === currentKey)?.order ?? 0;

  return (
    <motion.div className="space-y-0" variants={trackerList} initial="hidden" animate="show">
      {stages.map((stage, idx) => {
        const isDone = stage.order < currentOrder || terminalDone;
        const isActive = stage.key === currentKey && !terminalDone;
        const isPending = stage.order > currentOrder;
        const isLast = idx === stages.length - 1;

        const entryForStage = auditEntries.find(
          (e) => e.to_stage_key === stage.key || e.from_stage_key === stage.key
        );

        return (
          <motion.div key={stage.key} variants={trackerRow} className="flex gap-4">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08 + idx * 0.12, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                  isDone  && "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]",
                  isActive && "bg-khatulistiwa-600 shadow-[0_0_0_4px_rgba(24,80,136,0.2)] ring-2 ring-khatulistiwa-400",
                  isPending && "bg-white border-2 border-khatulistiwa-200"
                )}
              >
                {isDone && <DrawnCheck />}
                {isActive && <div className="w-3 h-3 rounded-full bg-white animate-pulse" />}
                {isPending && <div className="w-2.5 h-2.5 rounded-full bg-khatulistiwa-300/40" />}
                {!isDone && !isActive && !isPending && <Circle className="h-4 w-4 text-khatulistiwa-300" aria-hidden="true" />}
              </motion.div>

              {!isLast && (
                <div className="relative w-0.5 flex-1 min-h-[2rem] bg-khatulistiwa-100 overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-emerald-300 origin-top"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: isDone ? 1 : 0 }}
                    transition={{ delay: 0.2 + idx * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6 flex-1", isLast && "pb-0", isActive && "pb-8")}>
              <div className={cn(
                "rounded-xl p-4 transition-all",
                isActive ? "bg-khatulistiwa-50 border border-khatulistiwa-200" : "bg-transparent"
              )}>
                <p className={cn(
                  "font-display font-semibold text-sm",
                  isDone   ? "text-emerald-700"      :
                  isActive ? "text-khatulistiwa-800"  :
                             "text-khatulistiwa-400"
                )}>
                  {stage.name}
                </p>
                {entryForStage && isDone && (
                  <p className="text-khatulistiwa-400/60 text-xs mt-1">
                    {format(parseISO(entryForStage.created_at), "d MMM yyyy HH:mm", { locale: localeId })}
                    {entryForStage.actor_name && ` · ${entryForStage.actor_name}`}
                  </p>
                )}
                {isActive && (
                  <p className="text-khatulistiwa-600 text-xs font-semibold mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-khatulistiwa-500 animate-pulse" />
                    Tahap saat ini
                  </p>
                )}
                {isPending && <p className="text-khatulistiwa-400/50 text-xs mt-1">Menunggu</p>}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── Audit timeline ───────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  submit: "Permohonan diajukan",
  approve: "Disetujui oleh verifikator",
  reject: "Ditolak",
  revise: "Revisi diminta",
  resubmit: "Revisi dikirim",
  issue: "Izin diterbitkan",
  visit_scheduled: "Kunjungan lapangan dijadwalkan",
  visit_completed: "Kunjungan lapangan selesai",
};

const AUDIT_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  approve:         { dot: "bg-emerald-500",      text: "text-emerald-700",      bg: "bg-emerald-50" },
  issue:           { dot: "bg-emerald-500",      text: "text-emerald-700",      bg: "bg-emerald-50" },
  reject:          { dot: "bg-red-500",          text: "text-red-700",          bg: "bg-red-50" },
  revise:          { dot: "bg-amber-500",        text: "text-amber-700",        bg: "bg-amber-50" },
  resubmit:        { dot: "bg-amber-500",        text: "text-amber-700",        bg: "bg-amber-50" },
  submit:          { dot: "bg-khatulistiwa-500", text: "text-khatulistiwa-700", bg: "bg-khatulistiwa-50" },
  visit_scheduled: { dot: "bg-khatulistiwa-500", text: "text-khatulistiwa-700", bg: "bg-khatulistiwa-50" },
  visit_completed: { dot: "bg-emerald-500",      text: "text-emerald-700",      bg: "bg-emerald-50" },
  default:         { dot: "bg-slate-400",        text: "text-slate-600",        bg: "bg-slate-50" },
};

function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <div>
      {entries.map((entry) => {
        const style = AUDIT_STYLES[entry.action] ?? AUDIT_STYLES.default;
        const label = ACTION_LABEL[entry.action] ?? entry.action;
        return (
          <div key={entry.id} className="flex gap-3 py-3 border-b border-khatulistiwa-50 last:border-0">
            <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", style.dot)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-sm font-semibold", style.text)}>{label}</span>
                {(entry.to_stage_key ?? entry.from_stage_key) && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", style.bg, style.text)}>
                    {entry.to_stage_key ?? entry.from_stage_key}
                  </span>
                )}
              </div>
              {entry.notes && <p className="text-khatulistiwa-400/60 text-xs mt-0.5">{entry.notes}</p>}
              <p className="text-khatulistiwa-300/50 text-xs mt-1">
                {format(parseISO(entry.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}
                {entry.actor_name && ` · ${entry.actor_name}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TTE status badge ─────────────────────────────────────────────────────────

function TTEStatusBadge({ permitId }: { permitId: string }) {
  const { data } = useQuery<{
    status: string;
    is_mock: boolean;
    tte_enabled: boolean;
  }>({
    queryKey: ["tte-status", permitId],
    queryFn: () =>
      import("@/lib/api").then((m) =>
        m.default.get(`/tte/${permitId}/status/`).then((r) => r.data)
      ),
    staleTime: 30_000,
    retry: false,
  });

  if (!data || data.status === "not_started") return null;

  const label =
    data.status === "signed"
      ? "TTE BSrE ✓"
      : data.status === "mock"
      ? "Simulasi TTE"
      : data.status === "processing"
      ? "TTE Diproses…"
      : null;

  if (!label) return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
      data.status === "signed"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : data.is_mock
        ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
        : "bg-khatulistiwa-50 text-khatulistiwa-700 ring-1 ring-khatulistiwa-200"
    )}>
      {label}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: ["submission", id],
    queryFn: () => api.get(`/submissions/${id}/`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: auditEntries = [] } = useQuery<AuditEntry[]>({
    queryKey: ["submission", id, "audit"],
    queryFn: () => api.get(`/submissions/${id}/audit/`).then((r) => r.data.results ?? r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-khatulistiwa-400/70">Permohonan tidak ditemukan.</p>
      </div>
    );
  }

  const stages: StageRow[] = submission.schema_snapshot?.stages ?? [];
  const needsRevision = submission.status === "revision";
  const isIssued = ["issued", "collected", "approved"].includes(submission.status);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 text-xs text-khatulistiwa-400/60" aria-label="Breadcrumb">
        <button
          onClick={() => navigate("/portal")}
          className="hover:text-khatulistiwa-600 transition-colors font-medium"
        >
          Dashboard
        </button>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span className="text-khatulistiwa-700 font-semibold">{submission.reference_number}</span>
      </nav>

      {/* ── Page header — dark brand background ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #04182A 0%, #0A2540 100%)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-khatulistiwa-300/50 text-xs font-mono mb-2">Nomor Referensi</p>
            <p className="text-terakota-400 font-mono font-bold text-lg tracking-wider">
              {submission.reference_number}
            </p>
            <h1 className="text-white font-display font-bold text-xl mt-1">
              {submission.permit_type_name}
            </h1>
            <p className="text-khatulistiwa-300/60 text-sm mt-1">
              {submission.sektor_name} · Diajukan{" "}
              {format(parseISO(submission.created_at), "d MMM yyyy", { locale: localeId })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={submission.status} large />
            {isIssued && submission.issued_permit_id && (
              <Link
                to={`/validate/${submission.issued_permit_validation_uuid}`}
                className="flex items-center gap-2 bg-terakota-500/20 hover:bg-terakota-500/30
                           border border-terakota-500/40 text-terakota-300 px-4 py-2
                           rounded-xl text-sm font-semibold transition-all"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                Lihat / Unduh Izin
              </Link>
            )}
          </div>
        </div>

        {submission.sla_due_at && !isIssued && (
          <div className="mt-4 pt-4 border-t border-white/[0.08]">
            <SLACountdown dueAt={submission.sla_due_at} breached={submission.is_sla_breached} />
          </div>
        )}
      </motion.div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-5 gap-5">
        {/* Left: stepper — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="col-span-5 md:col-span-2 bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm p-6"
        >
          <h2 className="text-khatulistiwa-900 font-display font-bold text-sm mb-5">Status Proses</h2>
          {stages.length > 0 ? (
            <StageTracker
              stages={stages}
              currentKey={submission.current_stage_key}
              status={submission.status}
              auditEntries={auditEntries}
            />
          ) : (
            <p className="text-xs text-khatulistiwa-400/70">Data tahap tidak tersedia.</p>
          )}
        </motion.div>

        {/* Right: details + audit — 3 cols */}
        <div className="col-span-5 md:col-span-3 space-y-5">
          {/* Revision notice */}
          {needsRevision && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm font-semibold text-red-700 mb-1">Revisi Diperlukan</p>
              <p className="text-xs text-red-600/70">
                Verifikator meminta perbaikan. Lihat catatan di bawah dan unggah ulang dokumen
                atau perbaiki data yang diminta.
              </p>
            </motion.div>
          )}

          {/* Document requirements */}
          {(submission.schema_snapshot?.doc_requirements?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm p-5">
              <DocumentUploadSection
                submissionId={submission.id}
                requirements={submission.schema_snapshot.doc_requirements}
                readOnly={!needsRevision}
              />
            </div>
          )}

          {/* Audit log */}
          {auditEntries.length > 0 && (
            <div className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm p-5">
              <h2 className="text-khatulistiwa-900 font-display font-bold text-sm mb-4">
                Riwayat Aktivitas
              </h2>
              <AuditTimeline entries={auditEntries} />
            </div>
          )}

          {/* Data permohonan */}
          <div className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm p-6">
            <h2 className="text-khatulistiwa-900 font-display font-bold text-base mb-5">
              Data Permohonan
            </h2>
            <div>
              <p className="text-terakota-600 text-xs font-bold tracking-[0.15em] uppercase mb-3">
                Data Formulir
              </p>
              <div>
                {submission.schema_snapshot?.form_fields?.map(
                  (f: { key: string; label: string }) => {
                    const val = submission.form_data?.[f.key];
                    if (val === undefined || val === null || val === "") return null;
                    return (
                      <div
                        key={f.key}
                        className="grid grid-cols-2 gap-4 py-2.5 border-b border-khatulistiwa-50 last:border-0"
                      >
                        <span className="text-khatulistiwa-400/70 text-sm">{f.label}</span>
                        <span className="text-khatulistiwa-900 font-semibold text-sm">
                          {Array.isArray(val) ? val.join(", ") : String(val)}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* TTE status if applicable */}
            {isIssued && submission.issued_permit_id && (
              <div className="mt-5 pt-4 border-t border-khatulistiwa-50 flex items-center gap-2">
                <TTEStatusBadge permitId={submission.issued_permit_id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
