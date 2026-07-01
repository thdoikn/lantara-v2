import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import QrScannerModal from "@/components/QrScannerModal";
import { scanCheckIn, type Ticket } from "./api";
import { STATUS_LABEL, errMsg } from "./TicketView";
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
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">Anjungan Check-in</h1>
      <p className="mt-1 text-ink-muted">
        Pindai QR pada tiket pengunjung online untuk memasukkannya ke kolam panggil.
      </p>

      <button
        onClick={() => setScanning(true)}
        className="mt-6 w-full rounded-2xl bg-royal-600 px-6 py-4 text-lg font-semibold text-white hover:bg-royal-700"
      >
        Pindai QR Tiket
      </button>

      {last && (
        <div className="mt-6 rounded-2xl border border-royal-100 bg-white p-6 shadow-sm">
          <p className="text-5xl font-display font-bold text-royal-700">{last.number}</p>
          <p className="mt-1 text-sm text-ink-muted">{last.layanan_name}</p>
          <p className="mt-2 inline-block rounded-full bg-status-success/10 px-3 py-1 text-sm font-medium text-status-success">
            {STATUS_LABEL[last.status] ?? last.status}
          </p>
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
