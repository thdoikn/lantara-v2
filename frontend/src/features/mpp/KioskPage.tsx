import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listInstansi, kioskTake, type Instansi, type Layanan, type Ticket } from "./api";
import { TicketView, errMsg } from "./TicketView";
import { toast } from "@/lib/toast";

/**
 * On-site e-kiosk (anjungan) — anonymous walk-in take-a-number, fullscreen with
 * large touch targets. Optional email receipt; the number + QR are shown to
 * photograph regardless.
 */
export default function KioskPage() {
  const [tenant, setTenant] = useState<Instansi | null>(null);
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const { data: tenants } = useQuery({
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

  return (
    <div className="min-h-screen bg-royal-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <h1 className="font-display text-4xl font-bold">Antrean MPP IKN</h1>
          <p className="mt-1 text-royal-200">Ambil nomor antrean Anda</p>
        </header>

        {ticket ? (
          <div className="mx-auto mt-10 max-w-md">
            <div className="text-ink">
              <TicketView ticket={ticket} large />
            </div>
            <p className="mt-4 text-center text-royal-200">
              Foto nomor &amp; QR ini, atau tunggu panggilan pada layar.
            </p>
            <button
              onClick={reset}
              className="mt-6 w-full rounded-2xl bg-gold-500 px-6 py-4 text-lg font-bold text-royal-950"
            >
              Selesai
            </button>
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
      </div>
    </div>
  );
}

function StepTenants({ tenants, onPick }: { tenants: Instansi[]; onPick: (t: Instansi) => void }) {
  return (
    <div className="mt-10">
      <h2 className="mb-4 text-center text-xl text-royal-100">Pilih Instansi</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {tenants.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="rounded-3xl border border-royal-700/50 bg-royal-900 p-6 text-left hover:bg-royal-800"
          >
            <p className="text-xl font-semibold">{t.name}</p>
            <p className="mt-1 text-sm text-royal-300">
              {t.owner_type === "oikn" ? "Otorita IKN" : "Instansi Eksternal"}
            </p>
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
    <div className="mt-10">
      <button onClick={onBack} className="text-royal-300 hover:text-white">
        ← Ganti instansi
      </button>
      <h2 className="mb-4 mt-2 text-xl text-royal-100">{tenant.name} — Pilih Layanan</h2>

      <label className="mb-6 block">
        <span className="text-sm text-royal-300">Email (opsional — untuk kirim tiket)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="mt-1 w-full rounded-xl border border-royal-700 bg-royal-900 px-4 py-3 text-white placeholder:text-royal-400"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {tenant.layanan.map((l) => (
          <button
            key={l.id}
            onClick={() => onTake(l)}
            disabled={busy}
            className="rounded-3xl bg-gold-500 p-6 text-left text-royal-950 hover:opacity-90 disabled:opacity-60"
          >
            <p className="text-xl font-bold">{l.name}</p>
            <p className="mt-1 text-sm">± {l.avg_minutes} menit</p>
          </button>
        ))}
      </div>
    </div>
  );
}
