import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, RotateCcw, MapPin, ChevronLeft, AlertTriangle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { Submission, AuditEntry, DocumentRequirement } from "@/types";
import DocumentUploadSection from "../applicant/DocumentUploadSection";

const ACTION_TOAST: Record<string, string> = {
  approve: "Permohonan disetujui & dilanjutkan.",
  request_revision: "Permintaan revisi dikirim ke pemohon.",
  schedule_site_visit: "Kunjungan lapangan dijadwalkan.",
  reject: "Permohonan ditolak.",
};

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
    variant: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200",
    confirmVariant: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    type: "request_revision",
    label: "Minta Revisi",
    icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200",
    confirmVariant: "bg-amber-600 hover:bg-amber-700 text-white",
    requiresNote: true,
  },
  {
    type: "schedule_site_visit",
    label: "Jadwalkan Kunjungan",
    icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-khatulistiwa-50 hover:bg-khatulistiwa-100 text-khatulistiwa-700 border border-khatulistiwa-200",
    confirmVariant: "bg-khatulistiwa-700 hover:bg-khatulistiwa-800 text-white",
    requiresNote: true,
  },
  {
    type: "reject",
    label: "Tolak",
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
    variant: "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200",
    confirmVariant: "bg-red-600 hover:bg-red-700 text-white",
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

const AUDIT_DOT: Record<string, string> = {
  approve: "bg-emerald-500",
  reject: "bg-red-500",
  revise: "bg-amber-500",
  request_revision: "bg-amber-500",
  visit_scheduled: "bg-khatulistiwa-500",
  publish: "bg-emerald-500",
  collect: "bg-emerald-500",
};

const STAGE_LABELS: Record<string, string> = {
  "submit":                "Pengajuan",
  "pengajuan":              "Pengajuan Pemohon",
  "verifikasi":             "Verifikasi Tim Teknis",
  "verifikasi-teknis":      "Verifikasi Tim Teknis",
  "tim-teknis-verifikasi":  "Verifikasi Tim Teknis",
  "kunjungan-lapangan":     "Kunjungan Lapangan",
  "penerbitan":             "Penerbitan Izin",
  "penyerahan":             "Penyerahan ke Pemohon",
};

function stageLabel(key: string) {
  return STAGE_LABELS[key] ?? key.replace(/-/g, " ");
}

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
      <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5">
        <h2 className="font-display font-bold text-sm text-khatulistiwa-900 mb-3">Tindakan</h2>
        <p className="text-xs text-khatulistiwa-600/70">
          Permohonan ini sudah selesai diproses.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5 space-y-4">
      <h2 className="font-display font-bold text-sm text-khatulistiwa-900">Tindakan</h2>

      {active ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-khatulistiwa-900">
            {actions.find((a) => a.type === active)?.icon}
            {actions.find((a) => a.type === active)?.label}
          </div>
          {actions.find((a) => a.type === active)?.requiresNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Catatan (wajib)…"
              className="w-full bg-khatulistiwa-50/50 border border-khatulistiwa-100 rounded-xl px-4 py-3 text-khatulistiwa-900 placeholder-khatulistiwa-300 text-sm outline-none resize-none focus:bg-white focus:border-khatulistiwa-400 focus:ring-2 focus:ring-khatulistiwa-400/15 transition-all"
              aria-label="Catatan tindakan"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setActive(null)}
              className="flex-1 bg-white border border-khatulistiwa-200 hover:border-khatulistiwa-300 rounded-xl py-2 text-sm font-semibold text-khatulistiwa-700 transition-colors"
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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["submission", id] });
      qc.invalidateQueries({ queryKey: ["verifier-queue"] });
      toast.success(ACTION_TOAST[variables.action] ?? "Tindakan berhasil disimpan.");
    },
    onError: () => toast.error("Gagal menyimpan tindakan. Silakan coba lagi."),
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
          <div key={i} className="h-24 rounded-2xl bg-white animate-pulse border border-khatulistiwa-100" />
        ))}
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-khatulistiwa-600/70">Permohonan tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate("/verifier")}
        className="flex items-center gap-1.5 text-sm text-khatulistiwa-600/70 hover:text-khatulistiwa-900 transition-colors"
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
        className="rounded-2xl text-white p-6"
        style={{ background: "linear-gradient(135deg, #0D3060 0%, #185088 100%)" }}
      >
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-1">{submission.sektor_name}</p>
            <h1 className="font-display text-xl font-bold">{submission.permit_type_name}</h1>
            <p className="text-sm font-mono text-white/70 mt-1">{submission.reference_number}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{submission.applicant_name}</p>
            <p className="text-white/60 text-xs mt-0.5">{submission.applicant_email}</p>
            {submission.submitted_at && (
              <p className="text-xs text-white/60 mt-1">
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
          <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5">
            <h2 className="font-display font-bold text-sm text-khatulistiwa-900 mb-4">Data Permohonan</h2>
            <dl className="space-y-3">
              {submission.schema_snapshot?.form_fields?.map((f) => {
                const val = submission.form_data?.[f.key];
                if (val === undefined || val === null || val === "") return null;
                return (
                  <div key={f.key} className="flex gap-4 text-sm">
                    <dt className="w-44 shrink-0 text-khatulistiwa-600/70">{f.label}</dt>
                    <dd className="font-medium text-khatulistiwa-900 break-all">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Documents */}
          {(submission.schema_snapshot?.doc_requirements?.length ?? 0) > 0 && (
            <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5">
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
          <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5">
            <h2 className="font-display font-bold text-sm text-khatulistiwa-900 mb-4">Riwayat Aktivitas</h2>
            {auditEntries.length === 0 ? (
              <p className="text-xs text-khatulistiwa-600/70">Belum ada aktivitas tercatat.</p>
            ) : (
              <ol className="relative border-l border-khatulistiwa-100 ml-2 space-y-5">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="ml-4 text-sm">
                    <span className={cn(
                      "absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-white",
                      AUDIT_DOT[entry.action] ?? "bg-khatulistiwa-300"
                    )} />
                    <p className="font-semibold leading-tight text-khatulistiwa-900">
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </p>
                    {entry.actor_name && (
                      <p className="text-xs text-khatulistiwa-700 mt-0.5">oleh <span className="font-medium">{entry.actor_name}</span></p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-khatulistiwa-600/70 mt-0.5 italic">"{entry.notes}"</p>
                    )}
                    <p className="text-xs text-khatulistiwa-400/70 mt-0.5">
                      {format(parseISO(entry.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}
                      {entry.to_stage_key && entry.from_stage_key !== entry.to_stage_key && (
                        <span className="ml-1">· → {stageLabel(entry.to_stage_key)}</span>
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
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium"
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
                className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium"
              >
                Tindakan berhasil disimpan.
              </motion.div>
            )}
          </AnimatePresence>

          {/* SLA info */}
          {submission.sla_due_at && (
            <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5 text-sm space-y-3">
              <h2 className="font-display font-bold text-khatulistiwa-900">Informasi SLA</h2>
              <div className="flex justify-between items-center">
                <span className="text-khatulistiwa-600/70">Batas SLA</span>
                <span className={cn(
                  "font-semibold",
                  submission.is_sla_breached ? "text-red-600" : "text-khatulistiwa-900"
                )}>
                  {format(parseISO(submission.sla_due_at), "d MMM yyyy", { locale: localeId })}
                </span>
              </div>
              {submission.is_sla_breached && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  SLA telah terlampaui
                </div>
              )}
              {submission.is_sla_at_risk && !submission.is_sla_breached && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
