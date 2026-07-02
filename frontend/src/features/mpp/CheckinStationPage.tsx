import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ScanLine, CheckCircle2, ArrowRight } from "lucide-react";
import QrScannerModal from "@/components/QrScannerModal";
import { scanCheckIn, type Ticket } from "./api";
import { errMsg } from "./queueStatus";
import { StatusBadge } from "./QueueUI";
import { toast } from "@/lib/toast";

/**
 * Staffed anjungan check-in station: an operator scans an online visitor's ticket
 * QR to move their number into the calling pool.
 */
export default function CheckinStationPage() {
  const [scanning, setScanning] = useState(false);
  const [last, setLast] = useState<Ticket | null>(null);

  const checkin = useMutation({
    mutationFn: (code: string) => scanCheckIn(code),
    onSuccess: (t) => {
      setLast(t);
      toast.success(`${t.number} berhasil check-in.`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-royal-100 px-3 py-1 text-xs font-semibold text-royal-700">
        <ScanLine className="h-4 w-4" /> Anjungan Check-in
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">Pindai Tiket Pengunjung</h1>
      <p className="mt-1 text-ink-muted">
        Pindai QR pada tiket pengunjung online untuk memasukkannya ke kolam panggil.
      </p>

      <button
        onClick={() => setScanning(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-royal-600 px-6 py-4 text-lg font-semibold text-white shadow-glow-royal transition hover:bg-royal-700"
      >
        <ScanLine className="h-6 w-6" /> Pindai QR Tiket
      </button>

      {last && (
        <div className="mt-6 rounded-2xl border border-royal-100 bg-white p-6 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-status-success">
            <CheckCircle2 className="h-4 w-4" /> Berhasil check-in
          </div>
          <p className="font-display text-5xl font-bold text-royal-700">{last.number}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {last.instansi_name} — {last.layanan_name}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <StatusBadge status={last.status} size="sm" />
            {last.loket_code && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                <ArrowRight className="h-3.5 w-3.5" /> {last.loket_code}
              </span>
            )}
          </div>
        </div>
      )}

      {scanning && (
        <QrScannerModal
          onResult={(code) => {
            setScanning(false);
            checkin.mutate(code);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
