import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, RotateCcw, MapPin, ChevronLeft } from "lucide-react";
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
  requiresNote?: boolean;
}

const ACTIONS: ActionConfig[] = [
  {
    type: "approve",
    label: "Setujui",
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: "bg-jagawana hover:bg-jagawana-deep text-white",
  },
  {
    type: "request_revision",
    label: "Minta Revisi",
    icon: <RotateCcw className="h-4 w-4" />,
    variant: "bg-terakota/10 hover:bg-terakota/20 text-terakota border border-terakota/30",
    requiresNote: true,
  },
  {
    type: "schedule_site_visit",
    label: "Jadwalkan Kunjungan",
    icon: <MapPin className="h-4 w-4" />,
    variant: "bg-khatulistiwa/10 hover:bg-khatulistiwa/20 text-khatulistiwa border border-khatulistiwa/30",
    requiresNote: true,
  },
  {
    type: "reject",
    label: "Tolak",
    icon: <XCircle className="h-4 w-4" />,
    variant: "bg-saka/10 hover:bg-saka/20 text-saka border border-saka/30",
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

  const availableActions = ACTIONS.filter(() => {
    if (submission.status === "issued" || submission.status === "rejected") return false;
    return true;
  });

  function handleConfirm() {
    if (!active) return;
    onAction(active, note);
    setActive(null);
    setNote("");
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <h2 className="font-semibold text-sm">Tindakan</h2>

      {active ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {ACTIONS.find((a) => a.type === active)?.label}
          </p>
          {ACTIONS.find((a) => a.type === active)?.requiresNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Catatan (wajib)…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-khatulistiwa resize-none"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setActive(null)}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                isPending ||
                (ACTIONS.find((a) => a.type === active)?.requiresNote && !note.trim())
              }
              className="flex-1 rounded-lg bg-jagawana py-2 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors disabled:opacity-60"
            >
              {isPending ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {availableActions.map((action) => (
            <button
              key={action.type}
              onClick={() => setActive(action.type)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
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

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

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
          <div key={i} className="h-24 rounded-xl bg-white animate-pulse" />
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
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Antrean
        <span className="ml-1 text-xs opacity-60 hidden sm:inline">⌘←</span>
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <p className="text-xs text-buana uppercase tracking-wide">{submission.sektor_name}</p>
            <h1 className="font-display text-xl font-bold mt-1">{submission.permit_type_name}</h1>
            <p className="text-sm font-mono text-buana mt-1">{submission.reference_number}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{submission.applicant_name}</p>
            <p className="text-buana">{submission.applicant_email}</p>
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
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: form data + docs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Form data */}
          <div className="rounded-2xl border border-border bg-white p-5">
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
          {(submission.schema_snapshot?.document_requirements?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5">
              <DocumentUploadSection
                submissionId={submission.id}
                requirements={
                  submission.schema_snapshot.document_requirements as DocumentRequirement[]
                }
                readOnly
              />
            </div>
          )}

          {/* Audit log */}
          {auditEntries.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5">
              <h2 className="font-semibold text-sm mb-4">Riwayat Aktivitas</h2>
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-khatulistiwa mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">{entry.action}</p>
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
            <div className="rounded-lg bg-saka/5 border border-saka/30 px-4 py-3 text-sm text-saka">
              Terjadi kesalahan. Silakan coba lagi.
            </div>
          )}

          {actMutation.isSuccess && (
            <div className="rounded-lg bg-jagawana/5 border border-jagawana/30 px-4 py-3 text-sm text-jagawana">
              Tindakan berhasil disimpan.
            </div>
          )}

          {/* SLA info */}
          {submission.sla_due_at && (
            <div className="rounded-2xl border border-border bg-white p-5 text-sm space-y-2">
              <h2 className="font-semibold">Informasi SLA</h2>
              <div className="flex justify-between text-buana">
                <span>Batas SLA</span>
                <span className={cn("font-medium", submission.is_sla_breached && "text-saka")}>
                  {format(parseISO(submission.sla_due_at), "d MMM yyyy", { locale: localeId })}
                </span>
              </div>
              {submission.is_sla_breached && (
                <p className="text-xs text-saka font-semibold">⚠ SLA telah terlampaui</p>
              )}
              {submission.is_sla_at_risk && !submission.is_sla_breached && (
                <p className="text-xs text-terakota font-semibold">⚠ Mendekati batas SLA</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
