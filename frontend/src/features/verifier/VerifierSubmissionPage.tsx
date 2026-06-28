import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO, formatDistanceStrict, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, RotateCcw, MapPin, ChevronLeft, AlertTriangle, Clock, ArrowRightCircle, CalendarClock, History, Check, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/lib/auth";
import type { Submission, AuditEntry, DocumentRequirement, PaginatedResponse } from "@/types";
import DocumentUploadSection from "../applicant/DocumentUploadSection";

const ACTION_TOAST: Record<string, string> = {
  approve: "Permohonan disetujui & dilanjutkan.",
  request_revision: "Permintaan revisi dikirim ke pemohon.",
  schedule_site_visit: "Kunjungan lapangan dijadwalkan.",
  reject: "Permohonan ditolak.",
};

// ── Action panel ─────────────────────────────────────────────────────────────

type ActionType = "approve" | "reject" | "request_revision" | "schedule_site_visit";

interface RevisionFieldInput {
  field_key: string;
  is_doc_requirement: boolean;
  note: string;
}

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

interface VisitPayload {
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  officers: string;
}

function ActionPanel({
  submission,
  stageType,
  onAction,
  onScheduleVisit,
  isPending,
}: {
  submission: Submission;
  stageType: string;
  onAction: (type: ActionType, note: string, revisionFields?: RevisionFieldInput[]) => void;
  onScheduleVisit: (payload: VisitPayload) => void;
  isPending: boolean;
}) {
  const [active, setActive] = useState<ActionType | null>(null);
  const [note, setNote] = useState("");
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [visit, setVisit] = useState<VisitPayload>({ scheduled_date: "", scheduled_time: "", location: "", officers: "" });

  const allowedTypes = ACTIONS_FOR_STAGE[stageType] ?? ACTIONS_FOR_STAGE.verification;
  const actions = ALL_ACTIONS.filter((a) => allowedTypes.includes(a.type)).map((a) =>
    a.type === "approve" ? { ...a, label: APPROVE_LABEL[stageType] ?? a.label } : a
  );

  // Targets a verifier can flag for revision (form fields + document requirements).
  const revisionTargets = [
    ...(submission.schema_snapshot?.form_fields ?? []).map((f) => ({ id: `field:${f.key}`, key: f.key, label: f.label, isDoc: false })),
    ...(submission.schema_snapshot?.doc_requirements ?? []).map((d) => ({ id: `doc:${d.key}`, key: d.key, label: d.title, isDoc: true })),
  ];

  const isTerminal =
    submission.status === "approved" ||
    submission.status === "collected" ||
    submission.status === "rejected";

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (!active) return;
    if (active === "schedule_site_visit") {
      onScheduleVisit(visit);
      setActive(null);
      setVisit({ scheduled_date: "", scheduled_time: "", location: "", officers: "" });
      return;
    }
    const revisionFields =
      active === "request_revision"
        ? revisionTargets
            .filter((t) => flagged.has(t.id))
            .map((t) => ({ field_key: t.key, is_doc_requirement: t.isDoc, note: fieldNotes[t.id] ?? "" }))
        : undefined;
    onAction(active, note, revisionFields);
    setActive(null);
    setNote("");
    setFlagged(new Set());
    setFieldNotes({});
  }

  const confirmDisabled =
    isPending ||
    (active === "schedule_site_visit"
      ? !visit.scheduled_date
      : Boolean(actions.find((a) => a.type === active)?.requiresNote && !note.trim()));

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
          {/* Field-level revision targeting */}
          {active === "request_revision" && revisionTargets.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">
                Tandai bagian yang perlu diperbaiki
                <span className="font-normal text-amber-700/70"> (opsional)</span>
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {revisionTargets.map((t) => (
                  <div key={t.id}>
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flagged.has(t.id)}
                        onChange={() => toggleFlag(t.id)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-400/30"
                      />
                      <span className="text-xs text-khatulistiwa-800 flex-1 min-w-0 truncate">{t.label}</span>
                      <span className="text-[10px] font-medium text-amber-700/60 shrink-0">
                        {t.isDoc ? "Dokumen" : "Data"}
                      </span>
                    </label>
                    {flagged.has(t.id) && (
                      <input
                        type="text"
                        value={fieldNotes[t.id] ?? ""}
                        onChange={(e) => setFieldNotes((p) => ({ ...p, [t.id]: e.target.value }))}
                        placeholder={`Catatan untuk "${t.label}"…`}
                        className="ml-7 mb-1 w-[calc(100%-1.75rem)] rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs text-khatulistiwa-900 placeholder-amber-700/40 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30"
                      />
                    )}
                  </div>
                ))}
              </div>
              {flagged.size > 0 && (
                <p className="text-[11px] text-amber-700/80">{flagged.size} bagian ditandai</p>
              )}
            </div>
          )}
          {/* Structured site-visit scheduling */}
          {active === "schedule_site_visit" && (
            <div className="space-y-2.5 rounded-xl border border-khatulistiwa-200 bg-khatulistiwa-50/50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-khatulistiwa-700">
                  Tanggal
                  <input
                    type="date"
                    value={visit.scheduled_date}
                    onChange={(e) => setVisit((v) => ({ ...v, scheduled_date: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-khatulistiwa-200 bg-white px-2.5 py-1.5 text-sm text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
                  />
                </label>
                <label className="text-xs font-semibold text-khatulistiwa-700">
                  Waktu
                  <input
                    type="time"
                    value={visit.scheduled_time}
                    onChange={(e) => setVisit((v) => ({ ...v, scheduled_time: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-khatulistiwa-200 bg-white px-2.5 py-1.5 text-sm text-khatulistiwa-900 outline-none focus:border-khatulistiwa-400"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-khatulistiwa-700">
                Lokasi
                <input
                  type="text"
                  value={visit.location}
                  onChange={(e) => setVisit((v) => ({ ...v, location: e.target.value }))}
                  placeholder="Alamat / titik kunjungan"
                  className="mt-1 w-full rounded-lg border border-khatulistiwa-200 bg-white px-2.5 py-1.5 text-sm text-khatulistiwa-900 placeholder-khatulistiwa-300 outline-none focus:border-khatulistiwa-400"
                />
              </label>
              <label className="block text-xs font-semibold text-khatulistiwa-700">
                Petugas
                <input
                  type="text"
                  value={visit.officers}
                  onChange={(e) => setVisit((v) => ({ ...v, officers: e.target.value }))}
                  placeholder="Nama petugas (pisahkan dengan koma)"
                  className="mt-1 w-full rounded-lg border border-khatulistiwa-200 bg-white px-2.5 py-1.5 text-sm text-khatulistiwa-900 placeholder-khatulistiwa-300 outline-none focus:border-khatulistiwa-400"
                />
              </label>
            </div>
          )}
          {active !== "schedule_site_visit" && actions.find((a) => a.type === active)?.requiresNote && (
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
              disabled={confirmDisabled}
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

  // Repeat-applicant context: this applicant's other submissions.
  const { data: applicantHistory = [] } = useQuery<Submission[]>({
    queryKey: ["submission", id, "applicant-history"],
    queryFn: () => api.get(`/submissions/${id}/applicant-history/`).then((r) => r.data),
    enabled: !!id,
  });

  const scheduleVisit = useMutation({
    mutationFn: (payload: VisitPayload) => api.post(`/submissions/${id}/site-visit/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submission", id] });
      qc.invalidateQueries({ queryKey: ["submission", id, "audit"] });
      toast.success("Kunjungan lapangan dijadwalkan.");
    },
    onError: () => toast.error("Gagal menjadwalkan kunjungan."),
  });

  const completeVisit = useMutation({
    mutationFn: ({ visitId, findings }: { visitId: string; findings: string }) =>
      api.post(`/submissions/${id}/site-visit/${visitId}/complete/`, { findings }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submission", id] });
      qc.invalidateQueries({ queryKey: ["submission", id, "audit"] });
      toast.success("Kunjungan ditandai selesai.");
    },
    onError: () => toast.error("Gagal menyimpan kunjungan."),
  });

  const myId = useAuthStore((s) => s.user?.id);
  const claimMutation = useMutation({
    mutationFn: (op: "claim" | "release") => api.post(`/submissions/${id}/${op}/`),
    onSuccess: (_d, op) => {
      qc.invalidateQueries({ queryKey: ["submission", id] });
      qc.invalidateQueries({ queryKey: ["verifier-queue"] });
      qc.invalidateQueries({ queryKey: ["verifier-stats"] });
      toast.success(op === "claim" ? "Permohonan diklaim." : "Klaim dilepas.");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Gagal memproses klaim.");
    },
  });

  const actMutation = useMutation({
    mutationFn: ({ action, notes, revision_fields }: { action: string; notes?: string; revision_fields?: RevisionFieldInput[] }) =>
      api.post(`/submissions/${id}/act/`, { action, notes, revision_fields }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["submission", id] });
      qc.invalidateQueries({ queryKey: ["verifier-queue"] });
      toast.success(ACTION_TOAST[variables.action] ?? "Tindakan berhasil disimpan.");
    },
    onError: () => toast.error("Gagal menyimpan tindakan. Silakan coba lagi."),
  });

  // Find the submission that follows this one in any cached verifier queue, so
  // "approve & next" keeps the verifier moving without a trip back to the list.
  const nextQueuedId = useCallback((): string | null => {
    const caches = qc.getQueriesData<PaginatedResponse<Submission>>({ queryKey: ["verifier-queue"] });
    for (const [, data] of caches) {
      const list = data?.results ?? [];
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) return (list[idx + 1] ?? list[idx - 1])?.id ?? null;
    }
    return null;
  }, [qc, id]);

  const handleAction = useCallback(
    (type: ActionType, note: string, revisionFields?: RevisionFieldInput[]) => {
      // Revise/reject removes the item from this stage's queue, so flow to the
      // next queued submission (mirrors "approve & next").
      const goNext = type === "request_revision" || type === "reject";
      const next = goNext ? nextQueuedId() : null;
      actMutation.mutate(
        { action: type, notes: note, revision_fields: revisionFields },
        goNext
          ? { onSuccess: () => navigate(next ? `/verifier/submissions/${next}` : "/verifier/queue") }
          : undefined,
      );
    },
    [actMutation, nextQueuedId, navigate]
  );

  const approveAndNext = useCallback(() => {
    const next = nextQueuedId();
    actMutation.mutate(
      { action: "approve" },
      { onSuccess: () => navigate(next ? `/verifier/submissions/${next}` : "/verifier/queue") },
    );
  }, [actMutation, navigate, nextQueuedId]);

  useKeyboardShortcut("ArrowLeft", () => navigate("/verifier/queue"));

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
        onClick={() => navigate("/verifier/queue")}
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
          {/* Revision diff — before → after for resolved data revisions */}
          {(() => {
            const fmt = (v: unknown) =>
              Array.isArray(v) ? v.join(", ") : v === undefined || v === null || v === "" ? "—" : String(v);
            const labelOf = (key: string) =>
              submission.schema_snapshot?.form_fields?.find((f) => f.key === key)?.label ?? key;
            const diffs = (submission.revision_fields ?? [])
              .filter((r) => r.is_resolved && !r.is_doc_requirement)
              .map((r) => ({
                key: r.field_key,
                before: fmt(r.original_value),
                after: fmt(submission.form_data?.[r.field_key]),
              }))
              .filter((d) => d.before !== d.after);
            if (diffs.length === 0) return null;
            return (
              <div className="bg-white border border-amber-200 rounded-2xl p-5">
                <h2 className="font-display font-bold text-sm text-khatulistiwa-900 mb-3 flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  Perubahan dari Revisi
                </h2>
                <ul className="space-y-3">
                  {diffs.map((d) => (
                    <li key={d.key} className="text-sm">
                      <p className="text-xs font-semibold text-khatulistiwa-700 mb-1">{labelOf(d.key)}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 line-through decoration-red-300">
                          {d.before}
                        </span>
                        <span className="text-khatulistiwa-300" aria-hidden="true">→</span>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          {d.after}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

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
                {auditEntries.map((entry, idx) => {
                  const next = auditEntries[idx + 1];
                  const gap = next
                    ? formatDistanceStrict(parseISO(next.created_at), parseISO(entry.created_at), {
                        locale: localeId,
                      })
                    : null;
                  return (
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
                    {gap && (
                      <p className="text-[11px] text-khatulistiwa-400/60 mt-1">↳ {gap} kemudian</p>
                    )}
                  </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Right: actions + SLA (sticky on desktop so they stay reachable) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Claim / ownership */}
          {!["approved", "collected", "rejected"].includes(submission.status) && (
            submission.assigned_to ? (
              submission.assigned_to === myId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" aria-hidden="true" /> Anda menangani ini
                  </p>
                  <button
                    onClick={() => claimMutation.mutate("release")}
                    disabled={claimMutation.isPending}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-60"
                  >
                    Lepas
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-khatulistiwa-200 bg-khatulistiwa-50 p-4">
                  <p className="text-sm font-semibold text-khatulistiwa-800 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                    Ditangani oleh {submission.assigned_to_name}
                  </p>
                  <p className="text-xs text-khatulistiwa-600/70 mt-0.5">
                    Verifikator lain sedang menangani permohonan ini.
                  </p>
                </div>
              )
            ) : (
              <button
                onClick={() => claimMutation.mutate("claim")}
                disabled={claimMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-3 text-sm font-display font-bold text-emerald-700 transition-colors disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" /> Klaim Permohonan
              </button>
            )
          )}
          {(() => {
            const stageType =
              submission.schema_snapshot?.stages?.find((s) => s.key === submission.current_stage_key)?.stage_type ??
              "verification";
            const canApprove = (ACTIONS_FOR_STAGE[stageType] ?? ACTIONS_FOR_STAGE.verification).includes("approve");
            const isTerminal = ["approved", "collected", "rejected"].includes(submission.status);
            if (!canApprove || isTerminal) return null;
            return (
              <button
                onClick={approveAndNext}
                disabled={actMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-display font-bold text-white shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-60"
              >
                <ArrowRightCircle className="h-4 w-4" aria-hidden="true" />
                Setujui &amp; Berikutnya
              </button>
            );
          })()}
          <ActionPanel
            submission={submission}
            stageType={
              submission.schema_snapshot?.stages?.find(
                (s) => s.key === submission.current_stage_key
              )?.stage_type ?? "verification"
            }
            onAction={handleAction}
            onScheduleVisit={(p) => scheduleVisit.mutate(p)}
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
              {submission.stage_sla_due_at && (
                <div className="flex justify-between items-center">
                  <span className="text-khatulistiwa-600/70">SLA Tahap Ini</span>
                  <span className={cn(
                    "font-semibold",
                    isPast(parseISO(submission.stage_sla_due_at)) ? "text-red-600" : "text-khatulistiwa-900",
                  )}>
                    {formatDistanceStrict(parseISO(submission.stage_sla_due_at), new Date(), {
                      addSuffix: true, locale: localeId,
                    })}
                  </span>
                </div>
              )}
              {submission.revision_due_at && submission.status === "revision" && (
                <div className="flex justify-between items-center">
                  <span className="text-khatulistiwa-600/70">Batas Revisi Pemohon</span>
                  <span className={cn(
                    "font-semibold",
                    isPast(parseISO(submission.revision_due_at)) ? "text-red-600" : "text-amber-700",
                  )}>
                    {formatDistanceStrict(parseISO(submission.revision_due_at), new Date(), {
                      addSuffix: true, locale: localeId,
                    })}
                  </span>
                </div>
              )}
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

          {/* Site visits */}
          <SiteVisitsCard
            visits={submission.site_visits ?? []}
            onComplete={(visitId, findings) => completeVisit.mutate({ visitId, findings })}
            isPending={completeVisit.isPending}
          />

          {/* Applicant history */}
          <ApplicantHistoryCard history={applicantHistory} name={submission.applicant_name} />
        </div>
      </div>
    </div>
  );
}

// ── Site visits card ──────────────────────────────────────────────────────────

function SiteVisitsCard({
  visits,
  onComplete,
  isPending,
}: {
  visits: import("@/types").SiteVisit[];
  onComplete: (visitId: string, findings: string) => void;
  isPending: boolean;
}) {
  const [findings, setFindings] = useState<Record<string, string>>({});
  if (visits.length === 0) return null;
  return (
    <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5 space-y-3">
      <h2 className="font-display font-bold text-sm text-khatulistiwa-900 flex items-center gap-1.5">
        <CalendarClock className="h-4 w-4 text-khatulistiwa-500" aria-hidden="true" />
        Kunjungan Lapangan
      </h2>
      {visits.map((v) => (
        <div key={v.id} className="rounded-xl border border-khatulistiwa-100 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-khatulistiwa-900">
              {v.scheduled_date ?? "—"}
              {v.scheduled_time ? ` · ${v.scheduled_time.slice(0, 5)}` : ""}
            </p>
            {v.is_completed ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Check className="h-3 w-3" aria-hidden="true" /> Selesai
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Dijadwalkan
              </span>
            )}
          </div>
          {v.location && <p className="text-xs text-khatulistiwa-600/70 mt-1">📍 {v.location}</p>}
          {v.officers && <p className="text-xs text-khatulistiwa-600/70 mt-0.5">Petugas: {v.officers}</p>}
          {v.is_completed ? (
            v.findings && <p className="text-xs text-khatulistiwa-700 mt-1.5 italic">"{v.findings}"</p>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea
                value={findings[v.id] ?? ""}
                onChange={(e) => setFindings((p) => ({ ...p, [v.id]: e.target.value }))}
                rows={2}
                placeholder="Catatan hasil kunjungan…"
                className="w-full rounded-lg border border-khatulistiwa-200 bg-khatulistiwa-50/50 px-2.5 py-1.5 text-xs text-khatulistiwa-900 placeholder-khatulistiwa-300 outline-none resize-none focus:bg-white focus:border-khatulistiwa-400"
              />
              <button
                onClick={() => onComplete(v.id, findings[v.id] ?? "")}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Tandai Selesai
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Applicant history card ────────────────────────────────────────────────────

const HIST_STATUS_LABEL: Record<string, string> = {
  draft: "Draf", submitted: "Diajukan", in_review: "Ditinjau", revision: "Revisi",
  approved: "Disetujui", rejected: "Ditolak", publishing: "Penerbitan",
  collection: "Siap Diambil", collected: "Selesai", issued: "Diterbitkan",
};

function ApplicantHistoryCard({ history, name }: { history: Submission[]; name: string }) {
  if (history.length === 0) return null;
  const approved = history.filter((s) => ["approved", "issued", "collected"].includes(s.status)).length;
  const rejected = history.filter((s) => s.status === "rejected").length;
  return (
    <div className="bg-white border border-khatulistiwa-100 rounded-2xl p-5 space-y-3">
      <h2 className="font-display font-bold text-sm text-khatulistiwa-900 flex items-center gap-1.5">
        <History className="h-4 w-4 text-khatulistiwa-500" aria-hidden="true" />
        Riwayat Pemohon
      </h2>
      <p className="text-xs text-khatulistiwa-600/70">
        {name} memiliki {history.length} permohonan lain
        {(approved > 0 || rejected > 0) && (
          <> · <span className="text-emerald-700 font-medium">{approved} disetujui</span>
          {rejected > 0 && <>, <span className="text-red-600 font-medium">{rejected} ditolak</span></>}</>
        )}
      </p>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto">
        {history.map((s) => (
          <li key={s.id}>
            <Link
              to={`/verifier/submissions/${s.id}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-khatulistiwa-50 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium text-khatulistiwa-900 truncate">{s.permit_type_name}</span>
                <span className="block text-[11px] text-khatulistiwa-400/70 font-mono">{s.reference_number}</span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-khatulistiwa-600">
                {HIST_STATUS_LABEL[s.status] ?? s.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
