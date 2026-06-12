import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, Shield, Leaf, CalendarDays, User, Building2, FileCheck2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";

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

const DETAIL_FIELDS: { label: string; key: keyof ValidateResult; icon: React.ElementType; format?: (v: string | null) => string }[] = [
  { label: "Nomor Izin", key: "permit_number", icon: FileCheck2 },
  { label: "Pemegang Izin", key: "holder_name", icon: User },
  { label: "Jenis Izin", key: "permit_type_name", icon: Building2 },
  {
    label: "Tanggal Terbit",
    key: "issued_date",
    icon: CalendarDays,
    format: (v) => v ? format(parseISO(v), "d MMMM yyyy", { locale: localeId }) : "—",
  },
  {
    label: "Berlaku Hingga",
    key: "valid_until",
    icon: CalendarDays,
    format: (v) => v ? format(parseISO(v), "d MMMM yyyy", { locale: localeId }) : "Tidak ada batas",
  },
  { label: "Diterbitkan Oleh", key: "issued_by", icon: Building2 },
];

export default function PermitValidatePage() {
  const { uuid } = useParams<{ uuid: string }>();

  const { data, isLoading, isError } = useQuery<ValidateResult>({
    queryKey: ["validate", uuid],
    queryFn: () => api.get(`/permits/validate/${uuid}/`).then((r) => r.data),
    enabled: !!uuid,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-buana-dark flex flex-col">
      {/* Header */}
      <header className="border-b border-white/8 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-jagawana to-jagawana-deep
                            flex items-center justify-center">
              <Leaf className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-white text-base">Lantara</span>
          </Link>
          <span className="text-xs text-white/40 font-medium">Validasi Dokumen</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Loading */}
          {isLoading && (
            <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-12 text-center space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px]
                              border-jagawana border-t-transparent mx-auto" />
              <p className="text-white/50 text-sm">Memvalidasi dokumen…</p>
            </div>
          )}

          {/* Error / Invalid */}
          {isError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-saka/8 ring-1 ring-saka/20 p-10 text-center space-y-4"
            >
              <div className="h-16 w-16 rounded-2xl bg-saka/15 ring-1 ring-saka/20 flex items-center justify-center mx-auto">
                <XCircle className="h-8 w-8 text-saka" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white">Dokumen Tidak Valid</h1>
                <p className="text-sm text-white/45 mt-1.5">
                  Kode QR tidak ditemukan atau dokumen telah dicabut.
                </p>
              </div>
            </motion.div>
          )}

          {/* Result card */}
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`rounded-2xl ring-1 overflow-hidden ${
                data.is_valid
                  ? "bg-white/5 ring-jagawana/20"
                  : "bg-white/5 ring-saka/20"
              }`}
            >
              {/* Status bar */}
              <div className={`h-1.5 w-full ${data.is_valid ? "bg-gradient-to-r from-jagawana to-jagawana/60" : "bg-saka"}`} />

              <div className="p-7 space-y-6">
                {/* Status header */}
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ring-1 shrink-0 ${
                    data.is_valid
                      ? "bg-jagawana/15 ring-jagawana/25"
                      : "bg-saka/15 ring-saka/25"
                  }`}>
                    {data.is_valid
                      ? <CheckCircle2 className="h-7 w-7 text-jagawana" aria-hidden="true" />
                      : <XCircle className="h-7 w-7 text-saka" aria-hidden="true" />
                    }
                  </div>
                  <div>
                    <h1 className={`font-display text-xl font-bold ${
                      data.is_valid ? "text-white" : "text-saka"
                    }`}>
                      {data.is_valid ? "Dokumen Valid" : "Dokumen Tidak Valid"}
                    </h1>
                    <p className="text-sm text-white/45 mt-0.5">{data.validation_message}</p>
                  </div>
                </div>

                {/* Detail fields */}
                {data.is_valid && (
                  <div className="space-y-0 rounded-xl bg-white/5 ring-1 ring-white/8 overflow-hidden divide-y divide-white/6">
                    {DETAIL_FIELDS.map(({ label, key, icon: Icon, format: fmt }) => {
                      const raw = data[key];
                      const val = fmt ? fmt(raw as string | null) : (raw as string) || "—";
                      return (
                        <div key={key} className="flex items-center gap-3 px-4 py-3">
                          <Icon className="h-4 w-4 text-white/30 shrink-0" aria-hidden="true" />
                          <dt className="text-xs text-white/45 w-32 shrink-0">{label}</dt>
                          <dd className="text-sm font-medium text-white truncate">{val}</dd>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Trust footer */}
                <div className="flex items-center gap-2 text-xs text-white/30 pt-1">
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Divalidasi secara real-time terhadap database Otorita IKN</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
