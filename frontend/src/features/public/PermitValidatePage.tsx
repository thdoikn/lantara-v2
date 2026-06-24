import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
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
import { cn } from "@/lib/cn";
import PublicNav from "@/components/PublicNav";
import BatangBanyu from "@/components/BatangBanyu";
import QrScannerModal from "@/components/QrScannerModal";

interface ValidateResultData {
  is_valid: boolean;
  permit_number: string;
  holder_name: string;
  permit_type_name: string;
  sektor_name: string;
  issued_date: string | null;
  valid_until: string | null;
  issued_by: string;
  validation_message: string;
}

const DETAIL_FIELDS: {
  label: string;
  key: keyof ValidateResultData;
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
    format: (v) => (v ? format(parseISO(v), "d MMMM yyyy", { locale: localeId }) : "—"),
  },
  {
    label: "Berlaku Hingga",
    key: "valid_until",
    icon: CalendarDays,
    format: (v) => (v ? format(parseISO(v), "d MMMM yyyy", { locale: localeId }) : "Tidak ada batas"),
  },
  { label: "Diterbitkan Oleh", key: "issued_by", icon: Building2 },
];

// ── Input hub ─────────────────────────────────────────────────────────────────

function ValidateHub() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    // Reference numbers contain "/", so carry the value as a query param rather
    // than a path segment (which would break route matching).
    if (trimmed) navigate(`/validate?code=${encodeURIComponent(trimmed)}`);
  }

  function handleScan(code: string) {
    setScanning(false);
    if (code) navigate(`/validate?code=${encodeURIComponent(code)}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bg-white rounded-3xl border border-pertiwi-muted shadow-xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-khatulistiwa-800 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-terakota-400" aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="code-input"
              className="block text-khatulistiwa-900 font-display font-bold text-sm mb-2 tracking-wide uppercase"
            >
              Nomor Izin atau Kode QR
            </label>
            <input
              id="code-input"
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="LANTARA/SOSIAL/… atau UUID dari QR"
              className="w-full border border-pertiwi-muted bg-pertiwi-warm rounded-xl px-4 py-3.5 text-khatulistiwa-900
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

        <div className="flex items-center justify-center gap-2 mt-4">
          <Shield className="w-3.5 h-3.5 text-khatulistiwa-400/50" aria-hidden="true" />
          <p className="text-khatulistiwa-400/50 text-xs text-center">
            Validasi real-time terhadap database resmi Otorita IKN
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="bg-white rounded-2xl border border-pertiwi-muted p-4 text-center shadow-sm
                     hover:border-khatulistiwa-300 hover:shadow-md transition-all
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-khatulistiwa-500"
        >
          <QrCode className="w-6 h-6 text-khatulistiwa-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-khatulistiwa-900 font-semibold text-xs">Pindai QR Code</p>
          <p className="text-khatulistiwa-400/60 text-xs mt-1">Buka kamera untuk memindai QR pada dokumen izin</p>
        </button>
        <div className="bg-white rounded-2xl border border-pertiwi-muted p-4 text-center shadow-sm">
          <FileText className="w-6 h-6 text-khatulistiwa-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-khatulistiwa-900 font-semibold text-xs">Nomor Referensi</p>
          <p className="text-khatulistiwa-400/60 text-xs mt-1">Masukkan nomor LANTARA/… dari surat izin Anda</p>
        </div>
      </div>

      {scanning && <QrScannerModal onResult={handleScan} onClose={() => setScanning(false)} />}
    </motion.div>
  );
}

// ── Validate result ─────────────────────────────────────────────────────────

function ValidateResult({ code }: { code: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<ValidateResultData>({
    queryKey: ["validate", code],
    queryFn: () =>
      api.get(`/permits/validate/?code=${encodeURIComponent(code)}`).then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto rounded-3xl bg-white border border-pertiwi-muted shadow-xl p-12 text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-khatulistiwa-500 border-t-transparent mx-auto" />
        <p className="text-khatulistiwa-500/60 text-sm">Memvalidasi dokumen…</p>
      </div>
    );
  }

  // Network/server error (the API returns 200 + is_valid:false for "not found").
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
          <h1 className="font-display text-xl font-bold text-khatulistiwa-900">Gagal Memvalidasi</h1>
          <p className="text-sm text-khatulistiwa-500/60 mt-1.5">Terjadi gangguan koneksi. Silakan coba lagi.</p>
        </div>
        <button
          onClick={() => navigate("/validate")}
          className="inline-flex items-center gap-1.5 text-xs text-khatulistiwa-400/60 hover:text-khatulistiwa-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Coba lagi
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-full max-w-lg mx-auto rounded-3xl overflow-hidden bg-white shadow-xl border",
        data.is_valid ? "border-emerald-500/20" : "border-red-500/20",
      )}
    >
      {/* Status top bar */}
      <div
        className={cn(
          "h-1.5 w-full",
          data.is_valid ? "bg-gradient-to-r from-emerald-500 to-emerald-500/40" : "bg-red-600",
        )}
        aria-hidden="true"
      />

      <div className="p-8 space-y-6">
        {/* Status header */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center ring-1 shrink-0",
              data.is_valid ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200",
            )}
          >
            {data.is_valid ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden="true" />
            ) : (
              <XCircle className="h-7 w-7 text-red-400" aria-hidden="true" />
            )}
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
          <dl className="rounded-2xl bg-surface border border-pertiwi-muted overflow-hidden divide-y divide-pertiwi-muted">
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
          </dl>
        )}

        {/* Trust + back link */}
        <div className="flex items-center justify-between pt-1 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-khatulistiwa-400/50 min-w-0">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Divalidasi terhadap database resmi Otorita IKN</span>
          </div>
          <button
            onClick={() => navigate("/validate")}
            className="inline-flex items-center gap-1 text-xs text-khatulistiwa-400/60 hover:text-khatulistiwa-700 transition-colors shrink-0"
          >
            <ArrowLeft className="h-3 w-3" />
            {data.is_valid ? "Validasi lain" : "Coba lagi"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PermitValidatePage() {
  const { uuid } = useParams<{ uuid?: string }>();
  const [searchParams] = useSearchParams();
  // QR deep link arrives as /validate/:uuid; the hub form uses /validate?code=…
  const code = uuid ?? searchParams.get("code") ?? "";

  return (
    <div className="min-h-screen bg-khatulistiwa-950">
      <PublicNav />

      {/* Dark header */}
      <div className="relative pt-20 pb-24 px-8 text-center overflow-hidden bg-gradient-hero">
        <BatangBanyu variant="fill" opacity={0.05} className="text-terakota-400" />

        <div className="relative z-10">
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
            Masukkan nomor izin atau pindai QR code untuk memverifikasi keaslian dokumen secara real-time.
          </p>
        </div>

        {/* Curved wave to cream — tokenized via currentColor */}
        <div className="absolute bottom-0 left-0 right-0 text-pertiwi-warm" aria-hidden="true">
          <svg viewBox="0 0 1440 40" className="w-full block" preserveAspectRatio="none" style={{ height: "40px" }}>
            <path d="M0,40 L0,0 Q720,40 1440,0 L1440,40 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Cream body */}
      <div className="bg-pertiwi-warm px-8 py-16 min-h-[40vh]">
        <div className="max-w-lg mx-auto">
          {code ? <ValidateResult code={code} /> : <ValidateHub />}
        </div>
      </div>
    </div>
  );
}
