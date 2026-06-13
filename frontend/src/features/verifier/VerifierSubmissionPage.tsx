import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, RotateCcw, MapPin, ChevronLeft, AlertTriangle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Submission, AuditEntry, DocumentRequirement } from "@/types";
import DocumentUploadSection from "../applicant/DocumentUploadSection";

// ── Action panel ─────────────────────────────────────────────────────────────

type ActionType = "approve" | "reject" | "request_revision" | "schedule_site_visit";

interface ActionConfig {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  variant: string;
  confirmVariant: string;
  requiresNote?: boolean;
}

// Label for the "approve" button varies by stage type
const APPROVE_LABEL: Record<string, string> = {
  verification: "Setujui & Lanjutkan",
  publish: "Terbitkan Izin",
  collection: "Konfirmasi Penyerahan",
  payment: "Konfirmasi Pembayaran",
  external: "Konfirmasi Proses",
};

// Actions available per stage type — collection/publish don't need site-visit or revision
const ACTIONS_FOR_STAGE: Record<string, ActionType[]> = {
  verification: ["approve", "request_revision", "schedule_site_visit", "reject"],
  publish: ["approve", "reject"],
  collection: ["approve"],
  payment: ["approve", "reject"],
  external: ["approve", "reject"],
};

const ALL_ACTIONS: ActionConfig[] = [
  {
    type: "approve",
    label: "Setujui",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-jagawana/10 hover:bg-jagawana/20 text-jagawana border border-jagawana/20",
    confirmVariant: "bg-jagawana hover:bg-jagawana-deep text-white",
  },
  {
    type: "request_revision",
    label: "Minta Revisi",
    icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-terakota/8 hover:bg-terakota/15 text-amber-700 border border-terakota/20",
    confirmVariant: "bg-terakota hover:bg-amber-600 text-white",
    requiresNote: true,
  },
  {
    type: "schedule_site_visit",
    label: "Jadwalkan Kunjungan",
    icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-khatulistiwa/8 hover:bg-khatulistiwa/15 text-khatulistiwa border border-khatulistiwa/20",
    confirmVariant: "bg-khatulistiwa hover:bg-khatulistiwa-light text-white",
    requiresNote: true,
  },
  {
    type: "reject",
    label: "Tolak",
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-saka/8 hover:bg-saka/15 text-saka border border-saka/20",
    confirmVariant: "bg-saka hover:bg-red-700 text-white",
    requiresNote: true,
  },
];

const ACTION_LABEL: Record<string, string> = {
  submit: "Permohonan Diajukan",
  approve: "Disetujui / Lanjut Tahap",
  revise: "Revisi Diminta",
  request_revision: "Revisi Diminta",
  reject: "Ditolak",
  resubmit: "Revisi Dikirim Pemohon",
  visit_scheduled: "Kunjungan Lapangan Dijadwalkan",
  generate: "Draf Izin Diterbitkan",
  sign: "Izin Ditandatangani",
  publish: "Izin Diterbitkan",
  collect: "Izin Diambil Pemohon",
};

function ActionPanel({
  submission,
  stageType,
  onAction,
  isPending,
}: {
  submission: Submission;
  stageType: string;
  onAction: (type: ActionType, note: string) => void;
  isPending: boolean;
}) {
  const [active, setActive] = useState<ActionType | null>(null);
  const [note, setNote] = useState("");

  const allowedTypes = ACTIONS_FOR_STAGE[stageType] ?? ACTIONS_FOR_STAGE.verification;
  const actions = ALL_ACTIONS.filter((a) => allowedTypes.includes(a.type)).map((a) =>
    a.type === "approve" ? { ...a, label: APPROVE_LABEL[stageType] ?? a.label } : a
  );

  const isTerminal =
    submission.status === "approved" ||
    submission.status === "collected" ||
    submission.status === "rejected";

  function handleConfirm() {
    if (!active) return;
    onAction(active, note);
    setActive(null);
    setNote("");
  }

  if (isTerminal) {
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-sm mb-3">Tindakan</h2>
        <p className="text-xs text-buana">
          Permohonan ini sudah selesai diproses.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-sm">Tindakan</h2>

      {active ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {actions.find((a) => a.type === active)?.icon}
            {actions.find((a) => a.type === active)?.label}
          </div>
          {actions.find((a) => a.type === active)?.requiresNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Catatan (wajib)…"
              className="input resize-none"
              aria-label="Catatan tindakan"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setActive(null)}
              className="flex-1 btn-secondary py-2 text-sm"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                isPending ||
                Boolean(actions.find((a) => a.type === active)?.requiresNote && !note.trim())
              }
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-60",
                actions.find((a) => a.type === active)?.confirmVariant
              )}
            >
              {isPending ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.type}
              onClick={() => setActive(action.type)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold",
                "transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]",
                action.variant
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Keyboard shortcut hook ───────────────────────────────────────────────────

function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        callback();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback]);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VerifierSubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: ["submission", id],
    queryFn: () => api.get(`/submissions/${id}/`).then((r) => r.data),
  });

  const { data: auditEntries = [] } = useQuery<AuditEntry[]>({
    queryKey: ["submission", id, "audit"],
    queryFn: () => api.get(`/submissions/${id}/audit/`).then((r) => r.data.results ?? r.data),
    enabled: !!id,
  });

  const actMutation = useMutation({
    mutationFn: ({ action, notes }: { action: string; notes?: string }) =>
      api.post(`/submissions/${id}/act/`, { action, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submission", id] });
      qc.invalidateQueries({ queryKey: ["verifier-queue"] });
    },
  });

  const handleAction = useCallback(
    (type: ActionType, note: string) => {
      actMutation.mutate({ action: type, notes: note });
    },
    [actMutation]
  );

  useKeyboardShortcut("ArrowLeft", () => navigate("/verifier"));

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
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

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate("/verifier")}
        className="flex items-center gap-1.5 text-sm text-buana hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Antrean
        <span className="ml-1 text-xs opacity-50 hidden sm:inline">⌘←</span>
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card p-6"
      >
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <p className="section-label mb-1">{submission.sektor_name}</p>
            <h1 className="font-display text-xl font-bold">{submission.permit_type_name}</h1>
            <p className="text-sm font-mono text-buana mt-1">{submission.reference_number}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{submission.applicant_name}</p>
            <p className="text-buana text-xs mt-0.5">{submission.applicant_email}</p>
            {submission.submitted_at && (
              <p className="text-xs text-buana mt-1">
                Diajukan{" "}
                {format(parseISO(submission.submitted_at), "d MMM yyyy HH:mm", {
                  locale: localeId,
                })}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: form data + docs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Form data */}
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4">Data Permohonan</h2>
            <dl className="space-y-3">
              {submission.schema_snapshot?.form_fields?.map((f) => {
                const val = submission.form_data?.[f.key];
                if (val === undefined || val === null || val === "") return null;
                return (
                  <div key={f.key} className="flex gap-4 text-sm">
                    <dt className="w-44 shrink-0 text-buana">{f.label}</dt>
                    <dd className="font-medium break-all">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Documents */}
          {(submission.schema_snapshot?.doc_requirements?.length ?? 0) > 0 && (
            <div className="card p-5">
              <DocumentUploadSection
                submissionId={submission.id}
                requirements={
                  submission.schema_snapshot.doc_requirements as DocumentRequirement[]
                }
                readOnly
              />
            </div>
          )}

          {/* Audit log */}
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4">Riwayat Aktivitas</h2>
            {auditEntries.length === 0 ? (
              <p className="text-xs text-buana">Belum ada aktivitas tercatat.</p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-5">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="ml-4 text-sm">
                    <span className={cn(
                      "absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-white",
                      entry.action === "approve" ? "bg-jagawana" :
                      entry.action === "reject" ? "bg-saka" :
                      entry.action === "revise" || entry.action === "request_revision" ? "bg-amber-500" :
                      entry.action === "visit_scheduled" ? "bg-khatulistiwa" :
                      "bg-buana"
                    )} />
                    <p className="font-semibold leading-tight">
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </p>
                    {entry.actor_name && (
                      <p className="text-xs text-ink mt-0.5">oleh <span className="font-medium">{entry.actor_name}</span></p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-buana mt-0.5 italic">"{entry.notes}"</p>
                    )}
                    <p className="text-xs text-buana mt-0.5">
                      {format(parseISO(entry.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}
                      {entry.to_stage_key && entry.from_stage_key !== entry.to_stage_key && (
                        <span className="ml-1">· → {entry.to_stage_key.replace(/-/g, " ")}</span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Right: actions + SLA */}
        <div className="space-y-4">
          <ActionPanel
            submission={submission}
            stageType={
              submission.schema_snapshot?.stages?.find(
                (s) => s.key === submission.current_stage_key
              )?.stage_type ?? "verification"
            }
            onAction={handleAction}
            isPending={actMutation.isPending}
          />

          <AnimatePresence>
            {actMutation.isError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl bg-saka/5 ring-1 ring-saka/20 px-4 py-3 text-sm text-saka font-medium"
              >
                Terjadi kesalahan. Silakan coba lagi.
              </motion.div>
            )}

            {actMutation.isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl bg-jagawana/5 ring-1 ring-jagawana/20 px-4 py-3 text-sm text-jagawana font-medium"
              >
                Tindakan berhasil disimpan.
              </motion.div>
            )}
          </AnimatePresence>

          {/* SLA info */}
          {submission.sla_due_at && (
            <div className="card p-5 text-sm space-y-3">
              <h2 className="font-semibold">Informasi SLA</h2>
              <div className="flex justify-between items-center">
                <span className="text-buana">Batas SLA</span>
                <span className={cn(
                  "font-semibold",
                  submission.is_sla_breached ? "text-saka" : "text-foreground"
                )}>
                  {format(parseISO(submission.sla_due_at), "d MMM yyyy", { locale: localeId })}
                </span>
              </div>
              {submission.is_sla_breached && (
                <div className="flex items-center gap-1.5 text-xs text-saka font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  SLA telah terlampaui
                </div>
              )}
              {submission.is_sla_at_risk && !submission.is_sla_breached && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Mendekati batas SLA
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
