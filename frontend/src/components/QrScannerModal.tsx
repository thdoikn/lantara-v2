import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { X, CameraOff, ScanLine } from "lucide-react";

/**
 * In-browser QR scanner for permit validation. Opens the device camera,
 * decodes the QR, and hands the extracted code back to the parent.
 *
 * Permit QR codes encode the public URL `…/validate/<uuid>`, so we extract the
 * UUID (or any reference number after `/validate/`) before returning. Requires a
 * secure context (https or localhost) for camera access.
 */

type ScanError = "permission" | "no-camera" | null;

function extractCode(text: string): string {
  // Prefer a UUID anywhere in the payload (the QR validation id).
  const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0];
  // Otherwise take whatever follows /validate/ in a URL.
  const path = text.match(/\/validate\/([^/?#\s]+)/);
  if (path) return decodeURIComponent(path[1]);
  return text.trim();
}

export default function QrScannerModal({
  onResult,
  onClose,
}: {
  onResult: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<ScanError>(null);

  useEffect(() => {
    let scanner: QrScanner | null = null;
    let done = false;

    function handle(text: string) {
      if (done) return;
      done = true;
      scanner?.stop();
      onResult(extractCode(text));
    }

    const video = videoRef.current;
    if (!video) return;

    QrScanner.hasCamera().then((has) => {
      if (!has) {
        setError("no-camera");
        return;
      }
      scanner = new QrScanner(video, (res) => handle(res.data), {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
      });
      scanner.start().catch(() => {
        if (!done) setError("permission");
      });
    });

    return () => {
      done = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [onResult]);

  // Esc to close + focus the close button on open.
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-khatulistiwa-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Pindai QR Code"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pertiwi-muted">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-khatulistiwa-600" aria-hidden="true" />
            <h2 className="font-display font-bold text-khatulistiwa-900 text-base">Pindai QR Code</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="text-khatulistiwa-400 hover:text-khatulistiwa-700 transition-colors rounded-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-khatulistiwa-500"
            aria-label="Tutup pemindai"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Camera / error area */}
        <div className="relative aspect-square bg-khatulistiwa-950">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <CameraOff className="w-12 h-12 text-khatulistiwa-400/60 mb-4" aria-hidden="true" />
              <p className="text-white font-semibold text-sm">
                {error === "no-camera" ? "Kamera tidak ditemukan" : "Akses kamera ditolak"}
              </p>
              <p className="text-khatulistiwa-300/60 text-xs mt-2 leading-relaxed">
                {error === "no-camera"
                  ? "Perangkat ini tidak memiliki kamera. Masukkan nomor izin secara manual."
                  : "Izinkan akses kamera di browser Anda, atau masukkan nomor izin secara manual."}
              </p>
            </div>
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-4 text-center">
          <p className="text-khatulistiwa-500/70 text-xs">
            Arahkan kamera ke QR code pada dokumen izin.
          </p>
        </div>
      </div>
    </div>
  );
}
