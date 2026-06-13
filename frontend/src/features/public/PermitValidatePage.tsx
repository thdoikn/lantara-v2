import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CheckCircle2, XCircle, Shield, CalendarDays, User,
  Building2, FileCheck2, Search, ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import PublicNav from "@/components/PublicNav";

interface ValidateResult {
  is_valid: boolean;
  permit_number: string;
  holder_name: string;
  permit_type_name: string;
  sektor_name: string;
  issued_date: string;
  valid_until: string | null;
  issued_by: string;
  validation_message: string;
}

const DETAIL_FIELDS: {
  label: string;
  key: keyof ValidateResult;
  icon: React.ElementType;
  format?: (v: string | null) => string;
}[] = [
  { label: "Nomor Izin", key: "permit_number", icon: FileCheck2 },
  { label: "Pemegang Izin", key: "holder_name", icon: User },
  { label: "Jenis Izin", key: "permit_type_name", icon: Building2 },
  {
    label: "Tanggal Terbit",
    key: "issued_date",
    icon: CalendarDays,
    format: (v) =>
      v ? format(parseISO(v), "d MMMM yyyy", { locale: localeId }) : "—",
  },
  {
    label: "Berlaku Hingga",
    key: "valid_until",
    icon: CalendarDays,
    format: (v) =>
      v ? format(parseISO(v), "d MMMM yyyy", { locale: localeId }) : "Tidak ada batas",
  },
  { label: "Diterbitkan Oleh", key: "issued_by", icon: Building2 },
];

const PAGE_BG = `
  radial-gradient(ellipse 70% 50% at 20% 80%, rgba(30,64,175,0.18) 0%, transparent 60%),
  radial-gradient(ellipse 50% 40% at 80% 20%, rgba(30,64,175,0.12) 0%, transparent 55%),
  #04182A`;

// ── Input hub (no UUID) ─────────────────────────────────────────────────────

function ValidateHub() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) navigate(`/validate/${trimmed}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Glassy card */}
      <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/12 p-8 md:p-10 space-y-8">
        {/* Icon */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-royal-600/30 ring-1 ring-royal-500/40 flex items-center justify-center">
              <FileCheck2 className="h-8 w-8 text-royal-300" aria-hidden="true" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gold-500 ring-2 ring-royal-950 flex items-center justify-center">
              <Shield className="h-2.5 w-2.5 text-royal-950" aria-hidden="true" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Validasi Dokumen Izin</h1>
            <p className="text-sm text-white/50 mt-1.5 max-w-sm">
              Masukkan nomor izin atau UUID dari QR code untuk memverifikasi keaslian dokumen secara real-time.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="uuid-input" className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">
              Nomor Izin / UUID Dokumen
            </label>
            <input
              id="uuid-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Contoh: 550e8400-e29b-41d4-a716-446655440000"
              className="w-full rounded-xl bg-white/[0.07] border border-white/[0.12] px-4 py-3.5 text-sm text-white
                         placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-royal-500/50
                         focus:border-royal-500/50 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl
                       bg-royal-600 hover:bg-royal-500 disabled:opacity-40 disabled:cursor-not-allowed
                       px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(30,64,175,0.4)]
                       hover:shadow-[0_0_32px_rgba(30,64,175,0.6)] transition-all"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Validasi Sekarang
          </button>
        </form>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-white/30">
          <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Validasi real-time terhadap database resmi Otorita IKN</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Validate result ─────────────────────────────────────────────────────────

function ValidateResult({ uuid }: { uuid: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<ValidateResult>({
    queryKey: ["validate", uuid],
    queryFn: () => api.get(`/permits/validate/${uuid}/`).then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto rounded-3xl bg-white/[0.06] ring-1 ring-white/12 p-12 text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-royal-500 border-t-transparent mx-auto" />
        <p className="text-white/50 text-sm">Memvalidasi dokumen…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg mx-auto rounded-3xl bg-white/[0.06] ring-1 ring-red-500/20 p-10 text-center space-y-5"
      >
        <div className="h-16 w-16 rounded-2xl bg-red-500/15 ring-1 ring-red-500/20 flex items-center justify-center mx-auto">
          <XCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Dokumen Tidak Valid</h1>
          <p className="text-sm text-white/45 mt-1.5">Kode QR tidak ditemukan atau dokumen telah dicabut.</p>
        </div>
        <button
          onClick={() => navigate("/validate")}
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Coba UUID lain
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg mx-auto rounded-3xl overflow-hidden ring-1 bg-white/[0.06] backdrop-blur-xl"
      style={{ borderColor: data.is_valid ? "rgba(5,150,105,0.3)" : "rgba(220,38,38,0.3)" }}
    >
      {/* Status top bar */}
      <div
        className="h-1 w-full"
        style={{
          background: data.is_valid
            ? "linear-gradient(90deg, #059669, rgba(5,150,105,0.4))"
            : "#DC2626",
        }}
      />

      <div className="p-8 space-y-6">
        {/* Status header */}
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center ring-1 shrink-0"
            style={{
              backgroundColor: data.is_valid ? "rgba(5,150,105,0.15)" : "rgba(220,38,38,0.15)",
              borderColor: data.is_valid ? "rgba(5,150,105,0.25)" : "rgba(220,38,38,0.25)",
            }}
          >
            {data.is_valid
              ? <CheckCircle2 className="h-7 w-7 text-emerald-400" aria-hidden="true" />
              : <XCircle className="h-7 w-7 text-red-400" aria-hidden="true" />
            }
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              {data.is_valid ? "Dokumen Valid" : "Dokumen Tidak Valid"}
            </h1>
            <p className="text-sm text-white/45 mt-0.5">{data.validation_message}</p>
          </div>
        </div>

        {/* Detail fields */}
        {data.is_valid && (
          <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] overflow-hidden divide-y divide-white/[0.06]">
            {DETAIL_FIELDS.map(({ label, key, icon: Icon, format: fmt }) => {
              const raw = data[key];
              const val = fmt ? fmt(raw as string | null) : (raw as string) || "—";
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-4 w-4 text-white/25 shrink-0" aria-hidden="true" />
                  <dt className="text-xs text-white/40 w-32 shrink-0">{label}</dt>
                  <dd className="text-sm font-medium text-white truncate">{val}</dd>
                </div>
              );
            })}
          </div>
        )}

        {/* Trust + back link */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-white/25">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Divalidasi terhadap database resmi Otorita IKN</span>
          </div>
          <button
            onClick={() => navigate("/validate")}
            className="inline-flex items-center gap-1 text-xs text-white/35 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Kembali
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PermitValidatePage() {
  const { uuid } = useParams<{ uuid?: string }>();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PAGE_BG }}>
      <PublicNav />

      {/* Subtle glow orbs */}
      <div className="fixed top-1/4 left-1/4 h-96 w-96 rounded-full bg-royal-700/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-royal-600/8 blur-3xl pointer-events-none" aria-hidden="true" />

      <main className="flex-1 flex items-center justify-center px-4 py-8 pt-24">
        {uuid ? <ValidateResult uuid={uuid} /> : <ValidateHub />}
      </main>
    </div>
  );
}
