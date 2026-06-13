import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CheckCircle2, XCircle, Shield, ShieldCheck, CalendarDays, User,
  Building2, FileCheck2, Search, ArrowLeft, QrCode, FileText,
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
    >
      {/* Main validation card */}
      <div className="bg-white rounded-3xl border border-[#EDE8D5] shadow-xl p-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-khatulistiwa-800 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-terakota-400" aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="uuid-input"
              className="block text-khatulistiwa-900 font-display font-bold text-sm mb-2 tracking-wide uppercase"
            >
              Nomor Izin / UUID Dokumen
            </label>
            <input
              id="uuid-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Contoh: 550e8400-e29b-41d4-a716-446655440000"
              className="w-full border border-[#EDE8D5] bg-[#F5F0E8] rounded-xl px-4 py-3.5 text-khatulistiwa-900
                         placeholder-khatulistiwa-400/40 text-sm outline-none
                         focus:border-khatulistiwa-400 focus:ring-2 focus:ring-khatulistiwa-400/20
                         transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full bg-khatulistiwa-600 hover:bg-khatulistiwa-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-display font-bold py-4 rounded-xl transition-all
                       shadow-md shadow-khatulistiwa-600/20 hover:shadow-khatulistiwa-500/30
                       flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
            Validasi Sekarang
          </button>
        </form>

        {/* Trust signal */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Shield className="w-3.5 h-3.5 text-khatulistiwa-400/50" aria-hidden="true" />
          <p className="text-khatulistiwa-400/50 text-xs text-center">
            Validasi real-time terhadap database resmi Otorita IKN
          </p>
        </div>
      </div>

      {/* Helper info below card */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#EDE8D5] p-4 text-center shadow-sm">
          <QrCode className="w-6 h-6 text-khatulistiwa-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-khatulistiwa-900 font-semibold text-xs">Scan QR Code</p>
          <p className="text-khatulistiwa-400/60 text-xs mt-1">Pindai QR pada dokumen izin fisik atau digital</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#EDE8D5] p-4 text-center shadow-sm">
          <FileText className="w-6 h-6 text-khatulistiwa-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-khatulistiwa-900 font-semibold text-xs">Nomor Referensi</p>
          <p className="text-khatulistiwa-400/60 text-xs mt-1">Gunakan nomor LANTARA/... dari surat izin Anda</p>
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
      <div className="w-full max-w-lg mx-auto rounded-3xl bg-white border border-[#EDE8D5] shadow-xl p-12 text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-khatulistiwa-500 border-t-transparent mx-auto" />
        <p className="text-khatulistiwa-500/60 text-sm">Memvalidasi dokumen…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg mx-auto rounded-3xl bg-white border border-red-100 shadow-xl p-10 text-center space-y-5"
      >
        <div className="h-16 w-16 rounded-2xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center mx-auto">
          <XCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-khatulistiwa-900">Dokumen Tidak Valid</h1>
          <p className="text-sm text-khatulistiwa-500/60 mt-1.5">Kode QR tidak ditemukan atau dokumen telah dicabut.</p>
        </div>
        <button
          onClick={() => navigate("/validate")}
          className="inline-flex items-center gap-1.5 text-xs text-khatulistiwa-400/60 hover:text-khatulistiwa-700 transition-colors"
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
      className="w-full max-w-lg mx-auto rounded-3xl overflow-hidden bg-white shadow-xl"
      style={{ borderWidth: 1, borderStyle: "solid", borderColor: data.is_valid ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)" }}
    >
      {/* Status top bar */}
      <div
        className="h-1.5 w-full"
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
              backgroundColor: data.is_valid ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)",
              borderColor: data.is_valid ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)",
            }}
          >
            {data.is_valid
              ? <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden="true" />
              : <XCircle className="h-7 w-7 text-red-400" aria-hidden="true" />
            }
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-khatulistiwa-900">
              {data.is_valid ? "Dokumen Valid" : "Dokumen Tidak Valid"}
            </h1>
            <p className="text-sm text-khatulistiwa-500/60 mt-0.5">{data.validation_message}</p>
          </div>
        </div>

        {/* Detail fields */}
        {data.is_valid && (
          <div className="rounded-2xl bg-[#F8FAFF] border border-[#EDE8D5] overflow-hidden divide-y divide-[#EDE8D5]">
            {DETAIL_FIELDS.map(({ label, key, icon: Icon, format: fmt }) => {
              const raw = data[key];
              const val = fmt ? fmt(raw as string | null) : (raw as string) || "—";
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-4 w-4 text-khatulistiwa-400/50 shrink-0" aria-hidden="true" />
                  <dt className="text-xs text-khatulistiwa-500/60 w-32 shrink-0">{label}</dt>
                  <dd className="text-sm font-medium text-khatulistiwa-900 truncate">{val}</dd>
                </div>
              );
            })}
          </div>
        )}

        {/* Trust + back link */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-khatulistiwa-400/50">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Divalidasi terhadap database resmi Otorita IKN</span>
          </div>
          <button
            onClick={() => navigate("/validate")}
            className="inline-flex items-center gap-1 text-xs text-khatulistiwa-400/60 hover:text-khatulistiwa-700 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Kembali
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page — dark header + cream body ─────────────────────────────────────────

export default function PermitValidatePage() {
  const { uuid } = useParams<{ uuid?: string }>();

  return (
    <div className="min-h-screen" style={{ background: "#04182A" }}>
      <PublicNav />

      {/* Dark header section */}
      <div
        className="relative pt-20 pb-24 px-8 text-center"
        style={{ background: "linear-gradient(160deg, #04182A 0%, #0A2540 100%)" }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center justify-center gap-2 text-xs text-khatulistiwa-300/40 mb-8" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-terakota-400 transition-colors">Lantara</Link>
          <span aria-hidden="true">/</span>
          <span className="text-white/50">Validasi Dokumen</span>
        </nav>

        <p className="text-terakota-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">
          VERIFIKASI KEASLIAN
        </p>
        <h1 className="text-white font-display font-black text-4xl md:text-5xl mb-3">
          Validasi Dokumen Izin
        </h1>
        <p className="text-khatulistiwa-200/50 text-base max-w-md mx-auto">
          Masukkan nomor izin atau UUID dari QR code untuk memverifikasi keaslian dokumen secara real-time.
        </p>

        {/* Curved wave to cream — same pattern as katalog and izin detail */}
        <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
          <svg
            viewBox="0 0 1440 40"
            className="w-full block"
            preserveAspectRatio="none"
            style={{ height: "40px" }}
          >
            <path d="M0,40 L0,0 Q720,40 1440,0 L1440,40 Z" fill="#F5F0E8" />
          </svg>
        </div>
      </div>

      {/* Cream body */}
      <div className="bg-[#F5F0E8] px-8 py-16">
        <div className="max-w-lg mx-auto">
          {uuid ? <ValidateResult uuid={uuid} /> : <ValidateHub />}
        </div>
      </div>
    </div>
  );
}
