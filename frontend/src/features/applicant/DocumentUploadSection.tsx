import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, XCircle, Clock, Trash2, File as FileIcon, ExternalLink, RotateCw, X } from "lucide-react";
import axios from "axios";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import DocumentViewerModal, { type ViewerDoc } from "@/components/DocumentViewerModal";
import type { DocumentRequirement, UploadedDocument } from "@/types";

interface Props {
  submissionId: string;
  requirements: DocumentRequirement[];
  readOnly?: boolean;
  /** Requirement keys the verifier flagged for revision — highlighted. */
  flaggedKeys?: string[];
}

const STATUS_ICON = {
  pending:  <Clock className="h-4 w-4 text-terakota-500" />,
  valid:    <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  invalid:  <XCircle className="h-4 w-4 text-red-500" />,
  infected: <XCircle className="h-4 w-4 text-red-500" />,
};

export default function DocumentUploadSection({ submissionId, requirements, readOnly, flaggedKeys = [] }: Props) {
  const flaggedSet = new Set(flaggedKeys);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ViewerDoc | null>(null);
  // Last file that failed per requirement, kept so the user can retry in one click.
  const [failed, setFailed] = useState<Record<string, File>>({});
  const controllers = useRef<Record<string, AbortController>>({});

  const { data: docs } = useQuery<UploadedDocument[]>({
    queryKey: ["submissions", submissionId, "documents"],
    queryFn: () => api.get(`/submissions/${submissionId}/documents/`).then((r) => r.data.results ?? r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.delete(`/documents/${docId}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", submissionId, "documents"] });
      toast.success("Dokumen dihapus.");
    },
    onError: () => toast.error("Gagal menghapus dokumen. Coba lagi."),
  });

  async function handleUpload(req: DocumentRequirement, file: File) {
    // Client-side guards so the user gets instant, specific feedback.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = (req.allowed_types ?? []).map((t) => t.toLowerCase());
    if (allowed.length && !allowed.includes(ext)) {
      toast.error(`Format .${ext} tidak diizinkan untuk "${req.title}".`);
      return;
    }
    const maxBytes = req.max_bytes || 10_485_760;
    if (file.size > maxBytes) {
      toast.error(`File terlalu besar (maks ${(maxBytes / 1_048_576).toFixed(0)} MB).`);
      return;
    }

    setUploading((p) => ({ ...p, [req.key]: true }));
    setProgress((p) => ({ ...p, [req.key]: 0 }));
    setFailed((p) => { const n = { ...p }; delete n[req.key]; return n; });
    const controller = new AbortController();
    controllers.current[req.key] = controller;
    try {
      const fd = new FormData();
      fd.append("requirement_key", req.key);
      fd.append("file", file);
      await api.post(`/submissions/${submissionId}/documents/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.total) setProgress((p) => ({ ...p, [req.key]: Math.round((e.loaded / e.total!) * 100) }));
        },
      });
      qc.invalidateQueries({ queryKey: ["submissions", submissionId, "documents"] });
      toast.success(`"${req.title}" berhasil diunggah.`);
    } catch (err) {
      if (axios.isCancel(err)) {
        toast.info(`Unggahan "${req.title}" dibatalkan.`);
      } else {
        setFailed((p) => ({ ...p, [req.key]: file }));
        toast.error(`Gagal mengunggah "${req.title}". Coba lagi.`);
      }
    } finally {
      delete controllers.current[req.key];
      setUploading((p) => ({ ...p, [req.key]: false }));
      setProgress((p) => { const n = { ...p }; delete n[req.key]; return n; });
    }
  }

  function cancelUpload(reqKey: string) {
    controllers.current[reqKey]?.abort();
  }

  function getUploadedDoc(reqKey: string) {
    return docs?.find((d) => d.requirement_key === reqKey && d.is_active);
  }

  const requiredReqs = requirements.filter((r) => r.required);
  const requiredDone = requiredReqs.filter((r) => getUploadedDoc(r.key)).length;
  const requiredPct = requiredReqs.length ? Math.round((requiredDone / requiredReqs.length) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-khatulistiwa-900 font-display font-bold text-sm">Persyaratan Dokumen</h2>
        {requiredReqs.length > 0 && (
          <span
            className={cn(
              "text-xs font-semibold",
              requiredDone === requiredReqs.length ? "text-emerald-600" : "text-khatulistiwa-500",
            )}
          >
            {requiredDone}/{requiredReqs.length} dokumen wajib
          </span>
        )}
      </div>
      {requiredReqs.length > 0 && (
        <div
          className="h-1.5 rounded-full bg-khatulistiwa-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={requiredPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progres unggah dokumen wajib"
        >
          <div
            className={cn("h-full transition-[width] duration-300", requiredDone === requiredReqs.length ? "bg-emerald-500" : "bg-khatulistiwa-500")}
            style={{ width: `${requiredPct}%` }}
          />
        </div>
      )}
      {requirements.length === 0 && (
        <p className="text-sm text-buana">Tidak ada dokumen yang diperlukan untuk jenis izin ini.</p>
      )}
      {requirements.map((req) => {
        const uploaded = getUploadedDoc(req.key);
        const isUploading = uploading[req.key];
        const isFlagged = flaggedSet.has(req.key);

        return (
          <div
            key={req.key}
            className={cn(
              "rounded-xl border p-4 space-y-3 transition-colors",
              isFlagged ? "border-amber-300 bg-amber-50"
                : uploaded ? "border-emerald-200 bg-emerald-50/50"
                : "border-khatulistiwa-100/60 bg-white"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-khatulistiwa-900 text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                  {req.title}
                  {req.required && <span className="text-red-500 ml-0.5">*</span>}
                  {isFlagged && (
                    <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Perlu revisi
                    </span>
                  )}
                </p>
                {req.description && (
                  <p className="text-xs text-khatulistiwa-400/60 mt-0.5">{req.description}</p>
                )}
                <p className="text-xs text-khatulistiwa-400/50 mt-0.5">
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-khatulistiwa-50 border border-khatulistiwa-200 rounded-lg px-3 py-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      setViewing({
                        url: uploaded.file_url,
                        name: uploaded.original_filename ?? uploaded.file_url.split("/").pop() ?? "Dokumen",
                        mimeType: uploaded.mime_type,
                      })
                    }
                    className="flex items-center gap-2 min-w-0 flex-1 text-left group/file"
                    aria-label={`Pratinjau ${uploaded.original_filename ?? "dokumen"}`}
                  >
                    <FileIcon className="w-3.5 h-3.5 text-khatulistiwa-500 flex-shrink-0" aria-hidden="true" />
                    <span className="text-khatulistiwa-700 text-xs font-medium truncate group-hover/file:text-khatulistiwa-900 group-hover/file:underline">
                      {uploaded.original_filename ?? uploaded.file_url.split("/").pop()}
                    </span>
                  </button>
                  <a
                    href={uploaded.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-khatulistiwa-400 hover:text-khatulistiwa-600 flex-shrink-0 transition-colors"
                    aria-label="Buka dokumen di tab baru"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => deleteMutation.mutate(uploaded.id)}
                    className="text-khatulistiwa-300/60 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Hapus dokumen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : !readOnly ? (
              <label
                className="block cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); setDragOver(req.key); }}
                onDragLeave={() => setDragOver((k) => (k === req.key ? null : k))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleUpload(req, file);
                }}
              >
                <input
                  type="file"
                  accept={(req.allowed_types ?? []).map((t) => `.${t}`).join(",")}
                  className="sr-only peer"
                  aria-label={`Unggah dokumen ${req.title}`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(req, file);
                    e.target.value = "";
                  }}
                />
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 border-2 rounded-xl px-4 py-4 text-sm transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-khatulistiwa-400",
                    dragOver === req.key
                      ? "border-khatulistiwa-400 border-dashed bg-khatulistiwa-50 text-khatulistiwa-600"
                      : failed[req.key]
                      ? "border-red-200 bg-red-50/60 hover:border-red-300 text-red-500"
                      : "border-khatulistiwa-100 bg-khatulistiwa-50/60 hover:border-khatulistiwa-300 hover:bg-khatulistiwa-50 text-khatulistiwa-400",
                    isUploading && "pointer-events-none"
                  )}
                >
                  {isUploading ? (
                    <>
                      <span className="font-medium text-khatulistiwa-600">Mengunggah… {progress[req.key] ?? 0}%</span>
                      <div className="w-full h-1.5 rounded-full bg-khatulistiwa-100 overflow-hidden">
                        <div
                          className="h-full bg-khatulistiwa-500 transition-[width] duration-200"
                          style={{ width: `${progress[req.key] ?? 0}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); cancelUpload(req.key); }}
                        className="pointer-events-auto inline-flex items-center gap-1 text-xs font-semibold text-khatulistiwa-500 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" /> Batalkan
                      </button>
                    </>
                  ) : failed[req.key] ? (
                    <>
                      <span className="font-medium text-red-600">Unggahan gagal</span>
                      <span className="pointer-events-auto inline-flex items-center gap-1 text-xs font-semibold text-khatulistiwa-600">
                        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Klik untuk coba lagi
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-khatulistiwa-400" aria-hidden="true" />
                      <span className="font-medium">Klik atau seret file ke sini</span>
                    </>
                  )}
                </div>
              </label>
            ) : (
              <div className="flex items-center gap-2 bg-khatulistiwa-50 border border-dashed border-khatulistiwa-200 rounded-xl px-4 py-2.5">
                <Upload className="w-3.5 h-3.5 text-khatulistiwa-300 flex-shrink-0" aria-hidden="true" />
                <span className="text-khatulistiwa-400/60 text-xs">Belum diunggah</span>
              </div>
            )}
          </div>
        );
      })}
      <DocumentViewerModal doc={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
