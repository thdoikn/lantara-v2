import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Save, Trash2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { useFormDraft } from "@/lib/useFormDraft";
import type { PermitType, UploadedDocument } from "@/types";
import DynamicForm from "./DynamicForm";
import DocumentUploadSection from "./DocumentUploadSection";

type Step = "form" | "documents" | "review";

/** Drop File instances — only JSON-serializable values belong in a draft. */
function serializableData(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v instanceof File) continue;
    out[k] = v;
  }
  return out;
}

export default function NewSubmissionPage() {
  const { permitKey } = useParams<{ permitKey: string }>();
  const navigate = useNavigate();
  const { initial: draft, savedAt, save, clear } = useFormDraft(permitKey);
  const [step, setStep] = useState<Step>((draft?.step as Step) ?? "form");
  const [submissionId, setSubmissionId] = useState<string | null>(
    draft?.submissionId ?? null,
  );
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(
    draft?.form_data ?? {},
  );

  const persist = useCallback(
    (values: Record<string, unknown>) =>
      save({ form_data: serializableData(values), step, submissionId }),
    [save, step, submissionId],
  );

  const { data: permitType, isLoading } = useQuery<PermitType>({
    queryKey: ["permit-type", permitKey],
    queryFn: () =>
      api.get(`/permit-types/${permitKey}/schema/`).then((r) => r.data),
    enabled: !!permitKey,
  });

  const [apiError, setApiError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: { permit_type_key: string; form_data: Record<string, unknown> }) =>
      api.post("/submissions/", data),
    onSuccess: (res) => {
      setApiError(null);
      setSubmissionId(res.data.id);
      setReferenceNumber(res.data.reference_number ?? null);
      setStep("documents");
      save({ form_data: serializableData(formData), step: "documents", submissionId: res.data.id });
      toast.success(
        res.data.reference_number
          ? `Permohonan terkirim · ${res.data.reference_number}`
          : "Permohonan terkirim.",
      );
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; permit_type_key?: string; form_data?: Record<string, string[]> } } };
      const detail = axiosErr.response?.data?.detail
        ?? axiosErr.response?.data?.permit_type_key
        ?? JSON.stringify(axiosErr.response?.data?.form_data ?? "")
        ?? "Terjadi kesalahan. Silakan coba lagi.";
      setApiError(detail || "Terjadi kesalahan. Silakan coba lagi.");
    },
  });


  function handleFormSubmit(data: Record<string, unknown>) {
    setFormData(data);
    if (!permitKey) return;
    createMutation.mutate({ permit_type_key: permitKey, form_data: data });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!permitType) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-buana">Jenis izin tidak ditemukan.</p>
      </div>
    );
  }

  const stepLabels: { id: Step; label: string }[] = [
    { id: "form", label: "Data Permohonan" },
    { id: "documents", label: "Unggah Dokumen" },
    { id: "review", label: "Selesai" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-khatulistiwa-900 rounded-2xl p-6">
        <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase mb-1">
          {permitType.sektor_name}
        </p>
        <h1 className="text-white font-display font-bold text-xl">{permitType.name}</h1>
        <p className="text-khatulistiwa-300/50 text-xs mt-1">
          SLA: {permitType.sla_days} hari kerja · {permitType.product_name}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {stepLabels.map(({ id, label }, idx) => {
          const stepOrder = { form: 0, documents: 1, review: 2 };
          const current = stepOrder[step];
          const thisIdx = stepOrder[id];
          const done = thisIdx < current;
          const active = id === step;
          return (
            <div key={id} className="flex items-center gap-2.5 flex-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-khatulistiwa-600 text-white ring-4 ring-khatulistiwa-200"
                      : "bg-khatulistiwa-100 text-khatulistiwa-400"
                  }`}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-sm font-semibold hidden sm:block ${
                    active ? "text-khatulistiwa-900" : "text-khatulistiwa-400/70"
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${done ? "bg-emerald-400" : "bg-khatulistiwa-100"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Draft banner */}
      {savedAt !== null && step === "form" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-khatulistiwa-200/60 bg-khatulistiwa-50 px-4 py-2.5">
          <p className="flex items-center gap-2 text-xs text-khatulistiwa-700">
            <Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Draf tersimpan otomatis · terakhir{" "}
            {formatDistanceToNow(new Date(savedAt), { addSuffix: true, locale: localeId })}
          </p>
          <button
            type="button"
            onClick={() => {
              clear();
              setFormData({});
              setStep("form");
              toast.info("Draf dihapus.");
            }}
            className="flex items-center gap-1 text-xs font-semibold text-khatulistiwa-600 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Hapus draf
          </button>
        </div>
      )}

      {/* Step: Form */}
      {step === "form" && (
        <div className="bg-white rounded-2xl border border-khatulistiwa-100/60 shadow-sm p-6 space-y-4">
          <div className="rounded-xl bg-khatulistiwa-50 border border-khatulistiwa-200/60 p-4 text-xs text-khatulistiwa-700">
            Setelah menekan <strong>Kirim Permohonan</strong>, permohonan langsung masuk antrean
            verifikasi dan batas waktu (SLA) mulai berjalan. Anda tetap dapat mengunggah dokumen pada
            langkah berikutnya.
          </div>
          <DynamicForm
            permitType={permitType}
            defaultValues={formData}
            onChange={persist}
            onSubmit={handleFormSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Kirim Permohonan"
          />
          {apiError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}
        </div>
      )}

      {/* Step: Documents */}
      {step === "documents" && submissionId && (
        <DocumentStepSection
          submissionId={submissionId}
          requirements={permitType.doc_requirements ?? []}
          onBack={() => setStep("form")}
          onNext={() => setStep("review")}
        />
      )}

      {/* Step: Review — submission already received; this is a confirmation. */}
      {step === "review" && submissionId && (
        <div className="bg-white rounded-2xl border border-khatulistiwa-100/60 shadow-sm p-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-display font-bold text-sm text-emerald-900">Permohonan terkirim</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Permohonan Anda sudah masuk antrean verifikasi
                {referenceNumber && (
                  <> dengan nomor referensi <span className="font-mono font-semibold">{referenceNumber}</span></>
                )}
                . Pantau statusnya kapan saja di portal.
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-khatulistiwa-900 font-display font-bold text-base mb-4">
              Ringkasan Permohonan
            </h2>
            <dl className="space-y-3">
              {Object.entries(formData).map(([key, val]) => {
                const field = permitType.form_fields?.find((f) => f.key === key);
                if (!field || val === undefined || val === "") return null;
                return (
                  <div key={key} className="flex gap-4 text-sm py-2 border-b border-khatulistiwa-50 last:border-0">
                    <dt className="w-48 shrink-0 text-khatulistiwa-400/70">{field.label}</dt>
                    <dd className="text-khatulistiwa-900 font-medium">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("documents")}
              className="flex-1 rounded-xl border border-khatulistiwa-200 py-2.5 text-sm font-medium text-khatulistiwa-700 hover:bg-khatulistiwa-50 transition-colors"
            >
              Kembali ke Dokumen
            </button>
            <button
              onClick={() => {
                clear();
                navigate(`/portal/submissions/${submissionId}`);
              }}
              className="flex-1 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 py-2.5 text-sm font-display font-bold text-white transition-all shadow-md shadow-khatulistiwa-600/20"
            >
              Lihat Status Permohonan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Document step with required-doc gate ──────────────────────────────────────

function DocumentStepSection({
  submissionId,
  requirements,
  onBack,
  onNext,
}: {
  submissionId: string;
  requirements: import("@/types").DocumentRequirement[];
  onBack: () => void;
  onNext: () => void;
}) {
  const { data: docs = [] } = useQuery<UploadedDocument[]>({
    queryKey: ["submissions", submissionId, "documents"],
    queryFn: () =>
      api.get(`/submissions/${submissionId}/documents/`).then((r) => r.data.results ?? r.data),
    refetchInterval: 3000,
  });

  const requiredKeys = requirements.filter((r) => r.required).map((r) => r.key);
  const uploadedKeys = new Set(docs.filter((d) => d.is_active).map((d) => d.requirement_key));
  const missingRequired = requiredKeys.filter((k) => !uploadedKeys.has(k));
  const canProceed = missingRequired.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-khatulistiwa-100/60 shadow-sm p-6 space-y-6">
      <DocumentUploadSection
        submissionId={submissionId}
        requirements={requirements}
      />
      {!canProceed && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Unggah semua dokumen wajib (bertanda *) sebelum melanjutkan.
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-khatulistiwa-200 py-2.5 text-sm font-medium text-khatulistiwa-700 hover:bg-khatulistiwa-50 transition-colors"
        >
          Kembali
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 py-2.5 text-sm font-display font-bold text-white transition-all shadow-md shadow-khatulistiwa-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Lanjut ke Konfirmasi
        </button>
      </div>
    </div>
  );
}
