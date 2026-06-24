import { useEffect } from "react";
import { X, ExternalLink, FileText, Download } from "lucide-react";

export interface ViewerDoc {
  url: string;
  name: string;
  mimeType?: string;
}

/**
 * Inline document peek — lets a verifier review an uploaded file without
 * leaving the workspace. PDFs render in an iframe, images inline; anything
 * else falls back to a download/open affordance.
 */
export default function DocumentViewerModal({ doc, onClose }: { doc: ViewerDoc | null; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc) return null;

  const mime = doc.mimeType ?? "";
  const isPdf = mime.includes("pdf") || doc.url.toLowerCase().includes(".pdf");
  const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(doc.url);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-khatulistiwa-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau ${doc.name}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl h-[82vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-pertiwi-muted shrink-0">
          <FileText className="w-4 h-4 text-khatulistiwa-500 shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-0 text-sm font-semibold text-khatulistiwa-900 truncate">{doc.name}</p>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-khatulistiwa-500 hover:text-khatulistiwa-800 hover:bg-khatulistiwa-50 rounded-lg transition-colors"
            aria-label="Buka di tab baru"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
          <button
            onClick={onClose}
            className="p-2 text-khatulistiwa-400 hover:text-khatulistiwa-800 hover:bg-khatulistiwa-50 rounded-lg transition-colors"
            aria-label="Tutup pratinjau"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bg-khatulistiwa-50">
          {isPdf ? (
            <iframe src={doc.url} title={doc.name} className="w-full h-full" />
          ) : isImage ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img src={doc.url} alt={doc.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-8">
              <FileText className="w-12 h-12 text-khatulistiwa-300 mb-4" aria-hidden="true" />
              <p className="text-sm text-khatulistiwa-600">Pratinjau tidak tersedia untuk jenis file ini.</p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" /> Unduh berkas
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
