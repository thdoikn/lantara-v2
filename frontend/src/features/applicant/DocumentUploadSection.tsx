import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { DocumentRequirement, UploadedDocument } from "@/types";

interface Props {
  submissionId: string;
  requirements: DocumentRequirement[];
  readOnly?: boolean;
}

const STATUS_ICON = {
  pending: <Clock className="h-4 w-4 text-terakota" />,
  valid: <CheckCircle2 className="h-4 w-4 text-jagawana" />,
  invalid: <XCircle className="h-4 w-4 text-saka" />,
  infected: <XCircle className="h-4 w-4 text-saka" />,
};

export default function DocumentUploadSection({ submissionId, requirements, readOnly }: Props) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const { data: docs } = useQuery<UploadedDocument[]>({
    queryKey: ["submissions", submissionId, "documents"],
    queryFn: () => api.get(`/submissions/${submissionId}/documents/`).then((r) => r.data.results ?? r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.delete(`/documents/${docId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions", submissionId, "documents"] }),
  });

  async function handleUpload(requirementKey: string, file: File) {
    setUploading((p) => ({ ...p, [requirementKey]: true }));
    try {
      const fd = new FormData();
      fd.append("requirement_key", requirementKey);
      fd.append("file", file);
      await api.post(`/submissions/${submissionId}/documents/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries({ queryKey: ["submissions", submissionId, "documents"] });
    } finally {
      setUploading((p) => ({ ...p, [requirementKey]: false }));
    }
  }

  function getUploadedDoc(reqKey: string) {
    return docs?.find((d) => d.requirement_key === reqKey && d.is_active);
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Persyaratan Dokumen</h2>
      {requirements.length === 0 && (
        <p className="text-sm text-buana">Tidak ada dokumen yang diperlukan untuk jenis izin ini.</p>
      )}
      {requirements.map((req) => {
        const uploaded = getUploadedDoc(req.key);
        const isUploading = uploading[req.key];

        return (
          <div
            key={req.key}
            className={cn(
              "rounded-xl border p-4 space-y-3 transition-colors",
              uploaded ? "border-jagawana/30 bg-jagawana/5" : "border-border bg-white"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {req.title}
                  {req.required && <span className="text-saka ml-0.5">*</span>}
                </p>
                {req.description && (
                  <p className="text-xs text-buana mt-0.5">{req.description}</p>
                )}
                <p className="text-xs text-buana mt-0.5">
                  Format:{" "}
                  {(req.allowed_types ?? []).join(", ").toUpperCase() || "Semua format"} ·
                  Maks {req.max_bytes ? `${(req.max_bytes / 1_048_576).toFixed(0)} MB` : "10 MB"}
                </p>
              </div>
              {uploaded && (
                <div className="flex items-center gap-1">
                  {STATUS_ICON[uploaded.status] ?? STATUS_ICON.pending}
                </div>
              )}
            </div>

            {uploaded ? (
              <div className="flex items-center justify-between text-sm">
                <a
                  href={uploaded.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-khatulistiwa hover:underline truncate max-w-xs"
                >
                  {uploaded.original_filename ?? uploaded.file_url}
                </a>
                {!readOnly && (
                  <button
                    onClick={() => deleteMutation.mutate(uploaded.id)}
                    className="text-buana hover:text-saka transition-colors ml-2 shrink-0"
                    aria-label="Hapus dokumen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : !readOnly ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept={(req.allowed_types ?? []).map((t) => `.${t}`).join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(req.key, file);
                    e.target.value = "";
                  }}
                />
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-buana hover:border-jagawana hover:text-jagawana transition-colors",
                    isUploading && "opacity-60 pointer-events-none"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Mengunggah…" : "Pilih file"}
                </div>
              </label>
            ) : (
              <p className="text-xs text-saka">Belum diunggah</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
