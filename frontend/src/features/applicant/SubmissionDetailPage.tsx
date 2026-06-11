import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format, parseISO, formatDistanceToNow, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, AlertTriangle, FileText, ChevronRight } from "lucide-react";
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
        "flex items-center gap-1 text-xs font-medium",
        breached || overdue ? "text-saka" : "text-terakota"
      )}
    >
      {breached || overdue ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
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
    <div className="space-y-0">
      {stages.map((stage, idx) => {
        const isDone = stage.order < currentOrder || terminalDone;
        const isActive = stage.key === currentKey && !terminalDone;
        const isPending = stage.order > currentOrder;

        const entryForStage = auditEntries.find(
          (e) => e.to_stage_key === stage.key || e.from_stage_key === stage.key
        );

        return (
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-4"
          >
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors",
                  isDone
                    ? "bg-jagawana border-jagawana text-white"
                    : isActive
                    ? "border-jagawana text-jagawana bg-white"
                    : "border-border text-buana bg-white"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <div className="h-3 w-3 rounded-full bg-jagawana animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={cn("w-0.5 flex-1 min-h-[2rem]", isDone ? "bg-jagawana" : "bg-border")}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6 flex-1", idx === stages.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  isDone ? "text-jagawana" : isActive ? "text-foreground" : "text-buana"
                )}
              >
                {stage.name}
              </p>
              {isActive && (
                <p className="text-xs text-khatulistiwa mt-0.5 font-medium">Tahap saat ini</p>
              )}
              {entryForStage && isDone && (
                <p className="text-xs text-buana mt-0.5">
                  {format(parseISO(entryForStage.created_at), "d MMM yyyy HH:mm", {
                    locale: localeId,
                  })}
                  {entryForStage.actor_name && ` · ${entryForStage.actor_name}`}
                </p>
              )}
              {isPending && (
                <p className="text-xs text-buana mt-0.5">Menunggu</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
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
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-khatulistiwa mt-1.5 shrink-0" />
          <div>
            <p className="font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</p>
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        data.status === "signed"
          ? "bg-jagawana/10 text-jagawana"
          : data.is_mock
          ? "bg-buana/10 text-buana"
          : "bg-khatulistiwa/10 text-khatulistiwa"
      )}
    >
      {label}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: "Draft", className: "badge-pending" },
  submitted: { text: "Diajukan", className: "badge-pending" },
  in_review: { text: "Sedang Diverifikasi", className: "badge-info" },
  revision: { text: "Perlu Revisi", className: "badge-warn" },
  approved: { text: "Disetujui", className: "badge-success" },
  rejected: { text: "Ditolak", className: "badge-danger" },
  publishing: { text: "Penerbitan", className: "badge-info" },
  collection: { text: "Siap Diambil", className: "badge-success" },
  collected: { text: "Selesai", className: "badge-success" },
  issued: { text: "Diterbitkan", className: "badge-success" },
};

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
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-buana uppercase tracking-wide">
              {submission.sektor_name}
            </p>
            <h1 className="font-display text-xl font-bold mt-1">{submission.permit_type_name}</h1>
            <p className="text-sm text-buana mt-1 font-mono">{submission.reference_number}</p>
          </div>
          <span className={cn("badge", statusCfg.className)}>{statusCfg.text}</span>
        </div>

        {submission.sla_due_at && !isIssued && (
          <div className="mt-4">
            <SLACountdown
              dueAt={submission.sla_due_at}
              breached={submission.is_sla_breached}
            />
          </div>
        )}

        {isIssued && submission.issued_permit_id && (
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <Link
              to={`/validate/${submission.issued_permit_validation_uuid}`}
              className="inline-flex items-center gap-1.5 text-sm text-khatulistiwa hover:underline"
            >
              <FileText className="h-4 w-4" /> Lihat / Unduh Izin
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <TTEStatusBadge permitId={submission.issued_permit_id} />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left: tracker */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-white p-6">
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
        </div>

        {/* Right: details + audit */}
        <div className="md:col-span-3 space-y-5">
          {/* Revision notice */}
          {needsRevision && (
            <div className="rounded-xl border border-saka/30 bg-saka/5 p-4">
              <p className="text-sm font-semibold text-saka mb-1">Revisi Diperlukan</p>
              <p className="text-xs text-buana">
                Verifikator meminta perbaikan. Lihat catatan di bawah dan unggah ulang dokumen
                atau perbaiki data yang diminta.
              </p>
            </div>
          )}

          {/* Document section */}
          {(submission.schema_snapshot?.doc_requirements?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5">
              <DocumentUploadSection
                submissionId={submission.id}
                requirements={submission.schema_snapshot.doc_requirements}
                readOnly={!needsRevision}
              />
            </div>
          )}

          {/* Audit timeline */}
          {auditEntries.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5">
              <h2 className="font-semibold text-sm mb-4">Riwayat Aktivitas</h2>
              <AuditTimeline entries={auditEntries} />
            </div>
          )}

          {/* Form data summary */}
          <div className="rounded-2xl border border-border bg-white p-5">
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
