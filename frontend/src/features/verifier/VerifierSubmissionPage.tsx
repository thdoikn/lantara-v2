import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, RotateCcw, MapPin, ChevronLeft, AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";
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

const ACTIONS: ActionConfig[] = [
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

function ActionPanel({
  submission,
  onAction,
  isPending,
}: {
  submission: Submission;
  onAction: (type: ActionType, note: string) => void;
  isPending: boolean;
}) {
  const [active, setActive] = useState<ActionType | null>(null);
  const [note, setNote] = useState("");

  const isTerminal = submission.status === "issued" || submission.status === "rejected";

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
            {ACTIONS.find((a) => a.type === active)?.icon}
            {ACTIONS.find((a) => a.type === active)?.label}
          </div>
          {ACTIONS.find((a) => a.type === active)?.requiresNote && (
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
                Boolean(ACTIONS.find((a) => a.type === active)?.requiresNote && !note.trim())
              }
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-60",
                ACTIONS.find((a) => a.type === active)?.confirmVariant
              )}
            >
              {isPending ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {ACTIONS.map((action) => (
            <button
              key={action.type}
              onClick={() => setActive(action.type)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150",
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
          {auditEntries.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-sm mb-4">Riwayat Aktivitas</h2>
              <div className="space-y-4">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-khatulistiwa mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{entry.action}</p>
                      {entry.notes && <p className="text-buana text-xs mt-0.5">{entry.notes}</p>}
                      <p className="text-xs text-buana mt-0.5">
                        {format(parseISO(entry.created_at), "d MMM yyyy, HH:mm", {
                          locale: localeId,
                        })}
                        {entry.actor_name && ` · ${entry.actor_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: actions + SLA */}
        <div className="space-y-4">
          <ActionPanel
            submission={submission}
            onAction={handleAction}
            isPending={actMutation.isPending}
          />

          {actMutation.isError && (
            <div className="rounded-xl bg-saka/5 ring-1 ring-saka/20 px-4 py-3 text-sm text-saka font-medium">
              Terjadi kesalahan. Silakan coba lagi.
            </div>
          )}

          {actMutation.isSuccess && (
            <div className="rounded-xl bg-jagawana/5 ring-1 ring-jagawana/20 px-4 py-3 text-sm text-jagawana font-medium">
              Tindakan berhasil disimpan.
            </div>
          )}

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
