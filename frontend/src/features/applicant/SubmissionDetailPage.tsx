import { useParams, Link } from "react-router-dom";
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
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold",
        breached || overdue ? "text-saka" : "text-terakota"
      )}
    >
      {breached || overdue ? (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {overdue
        ? `Terlampaui ${formatDistanceToNow(due, { locale: localeId })}`
        : `Batas: ${formatDistanceToNow(due, { addSuffix: true, locale: localeId })}`}
    </span>
  );
}

// ── Stage tracker ────────────────────────────────────────────────────────────

interface StageRow {
  key: string;
  name: string;
  order: number;
}

// Hand-drawn check that strokes itself in — the tracker's signature flourish
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
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0",
                  isDone
                    ? "bg-jagawana border-jagawana text-white"
                    : isActive
                    ? "border-jagawana text-jagawana bg-white animate-ring-pulse"
                    : "border-border text-buana bg-white"
                )}
              >
                {isDone ? (
                  <DrawnCheck />
                ) : isActive ? (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-jagawana/60 animate-ping" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-jagawana" />
                  </span>
                ) : (
                  <Circle className="h-4 w-4" aria-hidden="true" />
                )}
              </motion.div>

              {!isLast && (
                <div className="relative w-0.5 flex-1 min-h-[2rem] bg-border overflow-hidden">
                  {/* fill draws downward as the stage completes */}
                  <motion.div
                    className="absolute inset-0 bg-jagawana origin-top"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: isDone ? 1 : 0 }}
                    transition={{ delay: 0.2 + idx * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6 flex-1", isLast && "pb-0")}>
              <p className={cn(
                "text-sm font-semibold",
                isDone ? "text-jagawana" : isActive ? "text-foreground" : "text-buana"
              )}>
                {stage.name}
              </p>
              {isActive && (
                <p className="text-xs text-khatulistiwa mt-0.5 font-medium">Tahap saat ini</p>
              )}
              {entryForStage && isDone && (
                <p className="text-xs text-buana mt-0.5">
                  {format(parseISO(entryForStage.created_at), "d MMM yyyy HH:mm", { locale: localeId })}
                  {entryForStage.actor_name && ` · ${entryForStage.actor_name}`}
                </p>
              )}
              {isPending && <p className="text-xs text-buana/60 mt-0.5">Menunggu</p>}
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

function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-khatulistiwa mt-1.5 shrink-0" />
          <div>
            <p className="font-semibold">{ACTION_LABEL[entry.action] ?? entry.action}</p>
            {entry.notes && <p className="text-buana text-xs mt-0.5">{entry.notes}</p>}
            <p className="text-xs text-buana mt-0.5">
              {format(parseISO(entry.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}
              {entry.actor_name && ` · ${entry.actor_name}`}
            </p>
          </div>
        </div>
      ))}
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
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        data.status === "signed"
          ? "bg-jagawana/10 text-jagawana ring-1 ring-jagawana/20"
          : data.is_mock
          ? "bg-buana/10 text-buana ring-1 ring-buana/20"
          : "bg-khatulistiwa/10 text-khatulistiwa ring-1 ring-khatulistiwa/20"
      )}
    >
      {label}
    </span>
  );
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft:      { text: "Draft",             className: "badge-pending" },
  submitted:  { text: "Diajukan",          className: "badge-pending" },
  in_review:  { text: "Sedang Diverifikasi", className: "badge-info" },
  revision:   { text: "Perlu Revisi",      className: "badge-warn" },
  approved:   { text: "Disetujui",         className: "badge-success" },
  rejected:   { text: "Ditolak",           className: "badge-danger" },
  publishing: { text: "Penerbitan",        className: "badge-info" },
  collection: { text: "Siap Diambil",      className: "badge-success" },
  collected:  { text: "Selesai",           className: "badge-success" },
  issued:     { text: "Diterbitkan",       className: "badge-success" },
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();

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
      <div className="max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-buana">Permohonan tidak ditemukan.</p>
      </div>
    );
  }

  const statusCfg = STATUS_LABEL[submission.status] ?? {
    text: submission.status,
    className: "badge-pending",
  };

  const stages: StageRow[] = submission.schema_snapshot?.stages ?? [];
  const needsRevision = submission.status === "revision";
  const isIssued = ["issued", "collected", "approved"].includes(submission.status);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label mb-1">{submission.sektor_name}</p>
            <h1 className="font-display text-xl font-bold">{submission.permit_type_name}</h1>
            <p className="text-sm text-buana mt-1 font-mono">{submission.reference_number}</p>
          </div>
          <span className={cn("badge", statusCfg.className)}>{statusCfg.text}</span>
        </div>

        {submission.sla_due_at && !isIssued && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <SLACountdown
              dueAt={submission.sla_due_at}
              breached={submission.is_sla_breached}
            />
          </div>
        )}

        {isIssued && submission.issued_permit_id && (
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-3 items-center">
            <Link
              to={`/validate/${submission.issued_permit_validation_uuid}`}
              className="inline-flex items-center gap-1.5 text-sm text-khatulistiwa font-semibold hover:underline"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Lihat / Unduh Izin
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <TTEStatusBadge permitId={submission.issued_permit_id} />
          </div>
        )}
      </motion.div>

      <div className="grid md:grid-cols-5 gap-5">
        {/* Left: tracker */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="md:col-span-2 card p-6"
        >
          <h2 className="font-semibold text-sm mb-5">Status Proses</h2>
          {stages.length > 0 ? (
            <StageTracker
              stages={stages}
              currentKey={submission.current_stage_key}
              status={submission.status}
              auditEntries={auditEntries}
            />
          ) : (
            <p className="text-xs text-buana">Data tahap tidak tersedia.</p>
          )}
        </motion.div>

        {/* Right: details + audit */}
        <div className="md:col-span-3 space-y-4">
          {/* Revision notice */}
          {needsRevision && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-saka/30 bg-saka/5 p-4"
            >
              <p className="text-sm font-semibold text-saka mb-1">Revisi Diperlukan</p>
              <p className="text-xs text-buana">
                Verifikator meminta perbaikan. Lihat catatan di bawah dan unggah ulang dokumen
                atau perbaiki data yang diminta.
              </p>
            </motion.div>
          )}

          {/* Document section */}
          {(submission.schema_snapshot?.doc_requirements?.length ?? 0) > 0 && (
            <div className="card p-5">
              <DocumentUploadSection
                submissionId={submission.id}
                requirements={submission.schema_snapshot.doc_requirements}
                readOnly={!needsRevision}
              />
            </div>
          )}

          {/* Audit timeline */}
          {auditEntries.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-sm mb-4">Riwayat Aktivitas</h2>
              <AuditTimeline entries={auditEntries} />
            </div>
          )}

          {/* Form data summary */}
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4">Data Permohonan</h2>
            <dl className="space-y-3">
              {submission.schema_snapshot?.form_fields?.map((f: { key: string; label: string }) => {
                const val = submission.form_data?.[f.key];
                if (val === undefined || val === null || val === "") return null;
                return (
                  <div key={f.key} className="flex gap-4 text-sm">
                    <dt className="w-40 shrink-0 text-buana">{f.label}</dt>
                    <dd className="font-medium">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
