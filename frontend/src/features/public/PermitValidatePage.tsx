import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, Shield } from "lucide-react";
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

export default function PermitValidatePage() {
  const { uuid } = useParams<{ uuid: string }>();

  const { data, isLoading, isError } = useQuery<ValidateResult>({
    queryKey: ["validate", uuid],
    queryFn: () => api.get(`/permits/validate/${uuid}/`).then((r) => r.data),
    enabled: !!uuid,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-buana-dark px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-white text-lg">
            Lantara
          </Link>
          <span className="text-xs text-white/60">Validasi Dokumen</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {isLoading && (
            <div className="rounded-2xl border border-border bg-white p-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-jagawana border-t-transparent mx-auto mb-4" />
              <p className="text-buana text-sm">Memvalidasi dokumen…</p>
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-saka/30 bg-saka/5 p-8 text-center space-y-4">
              <XCircle className="h-12 w-12 text-saka mx-auto" />
              <h1 className="font-display text-xl font-bold text-saka">Dokumen Tidak Valid</h1>
              <p className="text-sm text-buana">
                Kode QR tidak ditemukan atau dokumen telah dicabut.
              </p>
            </div>
          )}

          {data && (
            <div
              className={`rounded-2xl border p-8 space-y-6 ${
                data.is_valid
                  ? "border-jagawana/30 bg-jagawana/5"
                  : "border-saka/30 bg-saka/5"
              }`}
            >
              {/* Status */}
              <div className="flex items-center gap-3">
                {data.is_valid ? (
                  <CheckCircle2 className="h-12 w-12 text-jagawana shrink-0" />
                ) : (
                  <XCircle className="h-12 w-12 text-saka shrink-0" />
                )}
                <div>
                  <h1
                    className={`font-display text-2xl font-bold ${
                      data.is_valid ? "text-jagawana" : "text-saka"
                    }`}
                  >
                    {data.is_valid ? "Dokumen Valid" : "Dokumen Tidak Valid"}
                  </h1>
                  <p className="text-sm text-buana mt-0.5">{data.validation_message}</p>
                </div>
              </div>

              {/* Detail */}
              {data.is_valid && (
                <dl className="space-y-3 text-sm">
                  {[
                    { label: "Nomor Izin", value: data.permit_number },
                    { label: "Pemegang Izin", value: data.holder_name },
                    { label: "Jenis Izin", value: data.permit_type_name },
                    { label: "Sektor", value: data.sektor_name },
                    {
                      label: "Tanggal Terbit",
                      value: data.issued_date
                        ? format(parseISO(data.issued_date), "d MMMM yyyy", { locale: localeId })
                        : "—",
                    },
                    {
                      label: "Berlaku Hingga",
                      value: data.valid_until
                        ? format(parseISO(data.valid_until), "d MMMM yyyy", { locale: localeId })
                        : "Tidak ada batas",
                    },
                    { label: "Diterbitkan Oleh", value: data.issued_by },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-4">
                      <dt className="w-40 shrink-0 text-buana">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Trust indicator */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-buana">
                <Shield className="h-4 w-4" />
                Validasi dilakukan secara real-time terhadap database Lantara
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
