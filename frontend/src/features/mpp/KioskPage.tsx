import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  Building2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { listInstansi, kioskTake, type Instansi, type Layanan, type Ticket } from "./api";
import { TicketView } from "./TicketView";
import { errMsg } from "./queueStatus";
import { toast } from "@/lib/toast";

/**
 * On-site e-kiosk (anjungan) — anonymous walk-in, fullscreen, large touch
 * targets. A 3-step flow with a progress rail: Instansi → Layanan → Tiket.
 */
export default function KioskPage() {
  const [tenant, setTenant] = useState<Instansi | null>(null);
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["antrean", "instansi"],
    queryFn: listInstansi,
  });

  const take = useMutation({
    mutationFn: (l: Layanan) =>
      kioskTake({ layanan: l.id, holder_email: email.trim() || undefined }),
    onSuccess: (t) => setTicket(t),
    onError: (e) => toast.error(errMsg(e)),
  });

  function reset() {
    setTicket(null);
    setTenant(null);
    setEmail("");
  }

  const step = ticket ? 3 : tenant ? 2 : 1;

  return (
    <div className="flex min-h-screen flex-col bg-royal-950 text-white">
      <header className="border-b border-royal-800/60 px-6 py-4 text-center">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Antrean MPP IKN</h1>
        <StepRail step={step} />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-8">
        {ticket ? (
          <Confirmation ticket={ticket} onReset={reset} />
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-3 text-royal-200">
            <Loader2 className="h-6 w-6 animate-spin" /> Memuat…
          </div>
        ) : !tenant ? (
          <StepTenants tenants={tenants ?? []} onPick={setTenant} />
        ) : (
          <StepServices
            tenant={tenant}
            email={email}
            setEmail={setEmail}
            onBack={() => setTenant(null)}
            onTake={(l) => take.mutate(l)}
            busy={take.isPending}
          />
        )}
      </main>
    </div>
  );
}

function StepRail({ step }: { step: number }) {
  const labels = ["Pilih Instansi", "Pilih Layanan", "Tiket"];
  return (
    <ol className="mx-auto mt-3 flex max-w-md items-center">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-gold-500 text-royal-950"
                    : active
                      ? "bg-white text-royal-950"
                      : "bg-royal-800 text-royal-300"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <span className={`text-[10px] ${active ? "text-white" : "text-royal-300"}`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${step > n ? "bg-gold-500" : "bg-royal-800"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepTenants({ tenants, onPick }: { tenants: Instansi[]; onPick: (t: Instansi) => void }) {
  return (
    <div>
      <h2 className="mb-6 text-center text-2xl font-semibold text-royal-100">Pilih Instansi</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {tenants.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="flex items-center gap-4 rounded-3xl border border-royal-700/60 bg-royal-900 p-6 text-left transition hover:border-gold-500/60 hover:bg-royal-800"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-royal-800">
              {t.logo_url ? (
                <img src={t.logo_url} alt="" className="h-10 w-10 object-contain" />
              ) : (
                <Building2 className="h-7 w-7 text-gold-500" />
              )}
            </div>
            <div>
              <p className="text-xl font-semibold">{t.name}</p>
              <p className="mt-0.5 text-sm text-royal-300">
                {t.owner_type === "oikn" ? "Otorita IKN" : "Instansi Eksternal"} ·{" "}
                {t.layanan.length} layanan
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepServices({
  tenant,
  email,
  setEmail,
  onBack,
  onTake,
  busy,
}: {
  tenant: Instansi;
  email: string;
  setEmail: (v: string) => void;
  onBack: () => void;
  onTake: (l: Layanan) => void;
  busy: boolean;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-royal-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Ganti instansi
      </button>
      <h2 className="text-2xl font-semibold text-royal-100">{tenant.name}</h2>
      <p className="mb-5 text-royal-300">Pilih layanan yang Anda tuju</p>

      <label className="mb-6 block">
        <span className="text-sm text-royal-300">Email (opsional — untuk kirim tiket)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="mt-1.5 w-full rounded-2xl border border-royal-700 bg-royal-900 px-4 py-3.5 text-white outline-none placeholder:text-royal-400 focus:border-gold-500"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {tenant.layanan.map((l) => (
          <button
            key={l.id}
            onClick={() => onTake(l)}
            disabled={busy}
            className="rounded-3xl bg-gold-500 p-6 text-left text-royal-950 transition hover:brightness-105 disabled:opacity-60"
          >
            <p className="text-xl font-bold">{l.name}</p>
            <div className="mt-2 flex items-center gap-4 text-sm font-medium">
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> {l.waiting} antre
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> ± {l.avg_minutes} mnt
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Confirmation({ ticket, onReset }: { ticket: Ticket; onReset: () => void }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-status-success/15 px-4 py-1.5 text-sm font-semibold text-status-success">
        <CheckCircle2 className="h-4 w-4" /> Nomor berhasil diambil
      </div>
      <div className="text-ink">
        <TicketView ticket={ticket} large showStepper={false} />
      </div>
      <p className="mt-4 text-royal-200">
        Foto nomor &amp; QR ini, atau tunggu panggilan pada layar. Nomor juga dikirim ke email bila
        Anda mengisinya.
      </p>
      <button
        onClick={onReset}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-8 py-4 text-lg font-bold text-royal-950 hover:brightness-105"
      >
        <RotateCcw className="h-5 w-5" /> Ambil Nomor Lain
      </button>
    </div>
  );
}
