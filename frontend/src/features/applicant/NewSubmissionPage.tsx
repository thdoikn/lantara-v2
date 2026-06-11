import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import type { PermitType } from "@/types";
import DynamicForm from "./DynamicForm";
import DocumentUploadSection from "./DocumentUploadSection";

type Step = "form" | "documents" | "review";

export default function NewSubmissionPage() {
  const { permitKey } = useParams<{ permitKey: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const { data: permitType, isLoading } = useQuery<PermitType>({
    queryKey: ["permit-type", permitKey],
    queryFn: () =>
      api.get(`/permit-types/${permitKey}/schema/`).then((r) => r.data),
    enabled: !!permitKey,
  });

  const createMutation = useMutation({
    mutationFn: (data: { permit_type_key: string; form_data: Record<string, unknown> }) =>
      api.post("/submissions/", data),
    onSuccess: (res) => {
      setSubmissionId(res.data.id);
      setStep("documents");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/submissions/${id}/act/`, { action: "submit" }),
    onSuccess: (_, id) => navigate(`/portal/submissions/${id}`),
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
    { id: "review", label: "Konfirmasi" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-buana uppercase tracking-wide mb-1">{permitType.sektor_name}</p>
        <h1 className="font-display text-xl font-bold">{permitType.name}</h1>
        <p className="text-sm text-buana mt-1">
          SLA: {permitType.sla_days} hari kerja · {permitType.product_name}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map(({ id, label }, idx) => {
          const stepOrder = { form: 0, documents: 1, review: 2 };
          const current = stepOrder[step];
          const thisIdx = stepOrder[id];
          const done = thisIdx < current;
          const active = id === step;
          return (
            <div key={id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    done
                      ? "bg-jagawana border-jagawana text-white"
                      : active
                      ? "border-jagawana text-jagawana bg-white"
                      : "border-border text-buana bg-white"
                  }`}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    active ? "text-jagawana" : done ? "text-jagawana" : "text-buana"
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < stepLabels.length - 1 && (
                <div className={`flex-1 h-px ${done ? "bg-jagawana" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step: Form */}
      {step === "form" && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <DynamicForm
            permitType={permitType}
            onSubmit={handleFormSubmit}
            isSubmitting={createMutation.isPending}
          />
          {createMutation.isError && (
            <p className="mt-4 text-sm text-saka">
              Terjadi kesalahan. Silakan coba lagi.
            </p>
          )}
        </div>
      )}

      {/* Step: Documents */}
      {step === "documents" && submissionId && (
        <div className="rounded-2xl border border-border bg-white p-6 space-y-6">
          <DocumentUploadSection
            submissionId={submissionId}
            requirements={permitType.doc_requirements ?? []}
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep("form")}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep("review")}
              className="flex-1 rounded-lg bg-jagawana py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors"
            >
              Lanjut ke Konfirmasi
            </button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && submissionId && (
        <div className="rounded-2xl border border-border bg-white p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-4">Ringkasan Permohonan</h2>
            <dl className="space-y-3">
              {Object.entries(formData).map(([key, val]) => {
                const field = permitType.form_fields?.find((f) => f.key === key);
                if (!field || val === undefined || val === "") return null;
                return (
                  <div key={key} className="flex gap-4 text-sm">
                    <dt className="w-48 shrink-0 text-buana">{field.label}</dt>
                    <dd className="font-medium">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="rounded-lg bg-khatulistiwa/5 border border-khatulistiwa/20 p-4 text-sm text-khatulistiwa">
            Dengan menekan "Kirim Permohonan", Anda menyatakan bahwa seluruh data dan dokumen yang
            diunggah adalah benar dan dapat dipertanggungjawabkan.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("documents")}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => submitMutation.mutate(submissionId)}
              disabled={submitMutation.isPending}
              className="flex-1 rounded-lg bg-jagawana py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors disabled:opacity-60"
            >
              {submitMutation.isPending ? "Mengirim…" : "Kirim Permohonan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
