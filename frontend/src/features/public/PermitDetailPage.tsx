import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Clock, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Banknote, Scale, AlertCircle, Loader2, Users,
} from "lucide-react";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";
import type { PermitType } from "@/types";

export default function PermitDetailPage() {
  const { permitKey } = useParams<{ permitKey: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: permit, isLoading, isError } = useQuery<PermitType>({
    queryKey: ["permit-types", permitKey],
    queryFn: () => api.get(`/permit-types/${permitKey}/`).then((r) => r.data),
    enabled: !!permitKey,
  });

  const applyHref = isAuthenticated
    ? `/portal/new/${permitKey}`
    : `/auth/register`;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-khatulistiwa-950 flex items-center justify-center">
        <PublicNav />
        <Loader2 className="h-8 w-8 animate-spin text-khatulistiwa-400" />
      </main>
    );
  }

  if (isError || !permit) {
    return (
      <main className="min-h-screen bg-khatulistiwa-950">
        <PublicNav />
        <div className="max-w-3xl mx-auto px-4 pt-32 text-center">
          <AlertCircle className="h-12 w-12 text-status-danger mx-auto mb-4" />
          <h1 className="text-white font-display font-bold text-2xl mb-2">Izin tidak ditemukan</h1>
          <p className="text-khatulistiwa-300/60 mb-6">Layanan yang Anda cari tidak tersedia atau telah dihapus.</p>
          <Link to="/layanan" className="inline-flex items-center gap-2 text-sm text-khatulistiwa-300 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </Link>
        </div>
      </main>
    );
  }

  const sortedStages = [...(permit.stages ?? [])].sort((a, b) => a.order - b.order);
  const sortedDocs = [...(permit.doc_requirements ?? [])].sort((a, b) => a.order - b.order);
  const requiredDocs = sortedDocs.filter((d) => d.required);
  const optionalDocs = sortedDocs.filter((d) => !d.required);

  return (
    <main id="main-content" className="min-h-screen bg-khatulistiwa-950">
      <PublicNav />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(24,80,136,0.35) 0%, transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-10">
          <Link
            to="/layanan"
            className="inline-flex items-center gap-1.5 text-sm text-khatulistiwa-300/50 hover:text-white mb-7 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-bold text-terakota-400/90">Lantara</span>
            <span className="text-white/25 mx-0.5">/</span>
            Katalog Layanan
          </Link>

          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-terakota-500 text-xs font-bold tracking-[0.18em] uppercase mb-2">
                {permit.sektor_name}
              </p>
              <h1 className="font-display font-black text-white text-3xl md:text-4xl leading-tight mb-4">
                {permit.name}
              </h1>
              {permit.product_name && permit.product_name !== permit.name && (
                <p className="text-khatulistiwa-300/60 text-base">
                  Produk: <span className="text-khatulistiwa-200">{permit.product_name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-khatulistiwa-800/60 border border-khatulistiwa-600/30 rounded-xl px-4 py-2.5">
                <Clock className="h-4 w-4 text-khatulistiwa-300" aria-hidden="true" />
                <span className="text-white font-semibold text-sm">{permit.sla_days} hari kerja</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-8">

        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-khatulistiwa-800/70 to-khatulistiwa-900/80
                     border border-khatulistiwa-600/30 p-6 flex items-center justify-between gap-4 flex-wrap"
        >
          <div>
            <p className="text-white font-display font-bold text-lg">Siap mengajukan?</p>
            <p className="text-khatulistiwa-300/60 text-sm mt-0.5">
              {isAuthenticated
                ? "Mulai permohonan Anda sekarang — proses sepenuhnya digital."
                : "Daftar gratis untuk memulai permohonan secara digital."}
            </p>
          </div>
          <Link
            to={applyHref}
            className="inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                       text-white px-6 py-3 text-sm font-semibold transition-colors shrink-0"
          >
            {isAuthenticated ? "Ajukan Permohonan" : "Daftar & Ajukan"}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Persyaratan Dokumen */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            aria-labelledby="docs-heading"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-khatulistiwa-600/20 border border-khatulistiwa-500/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-khatulistiwa-300" aria-hidden="true" />
              </div>
              <h2 id="docs-heading" className="text-white font-display font-bold text-lg">
                Persyaratan Dokumen
              </h2>
            </div>

            {sortedDocs.length === 0 ? (
              <p className="text-khatulistiwa-300/50 text-sm">Belum ada persyaratan dokumen terdaftar.</p>
            ) : (
              <div className="space-y-3">
                {requiredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 rounded-xl bg-khatulistiwa-900/50 border border-khatulistiwa-700/20 p-3.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-status-success mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{doc.title}</p>
                      {doc.description && (
                        <p className="text-khatulistiwa-300/55 text-xs mt-0.5">{doc.description}</p>
                      )}
                      {doc.allowed_types?.length > 0 && (
                        <p className="text-khatulistiwa-300/40 text-xs mt-1">
                          Format: {doc.allowed_types.join(", ").toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {optionalDocs.length > 0 && (
                  <>
                    <p className="text-khatulistiwa-300/40 text-xs font-semibold uppercase tracking-wider mt-4 mb-2">
                      Opsional
                    </p>
                    {optionalDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start gap-3 rounded-xl bg-khatulistiwa-900/30 border border-khatulistiwa-700/15 p-3.5 opacity-75"
                      >
                        <CheckCircle2 className="h-4 w-4 text-khatulistiwa-400/50 mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-khatulistiwa-200 text-sm font-medium">{doc.title}</p>
                          {doc.description && (
                            <p className="text-khatulistiwa-300/50 text-xs mt-0.5">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.section>

          {/* Alur Proses */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            aria-labelledby="stages-heading"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-khatulistiwa-600/20 border border-khatulistiwa-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-khatulistiwa-300" aria-hidden="true" />
              </div>
              <h2 id="stages-heading" className="text-white font-display font-bold text-lg">
                Alur Proses
              </h2>
            </div>

            {sortedStages.length === 0 ? (
              <p className="text-khatulistiwa-300/50 text-sm">Belum ada alur proses terdaftar.</p>
            ) : (
              <ol className="relative space-y-0" aria-label="Tahapan proses perizinan">
                {sortedStages.map((stage, i) => {
                  const isLast = i === sortedStages.length - 1;
                  return (
                    <li key={stage.id} className="flex gap-4">
                      {/* line + dot */}
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-khatulistiwa-600/30 border border-khatulistiwa-500/40
                                        flex items-center justify-center shrink-0 text-xs font-bold text-khatulistiwa-200">
                          {i + 1}
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-khatulistiwa-700/30 my-1" aria-hidden="true" />}
                      </div>

                      <div className={`pb-5 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
                        <p className="text-white text-sm font-semibold leading-snug">{stage.name}</p>
                        {stage.actor_role && (
                          <p className="text-khatulistiwa-300/50 text-xs mt-0.5">{stage.actor_role}</p>
                        )}
                        {stage.sla_hours > 0 && (
                          <p className="text-khatulistiwa-300/40 text-xs mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {stage.sla_hours < 24
                              ? `${stage.sla_hours} jam`
                              : `${Math.round(stage.sla_hours / 8)} hari kerja`}
                          </p>
                        )}
                        {stage.instructions && (
                          <p className="text-khatulistiwa-300/50 text-xs mt-1">{stage.instructions}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </motion.section>
        </div>

        {/* Info strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {permit.fee_description && (
            <div className="rounded-xl bg-khatulistiwa-900/50 border border-khatulistiwa-700/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-gold-500" aria-hidden="true" />
                <p className="text-khatulistiwa-200 text-xs font-bold uppercase tracking-wider">Biaya</p>
              </div>
              <p className="text-white text-sm">{permit.fee_description}</p>
            </div>
          )}

          {permit.legal_basis && permit.legal_basis.length > 0 && (
            <div className={`rounded-xl bg-khatulistiwa-900/50 border border-khatulistiwa-700/20 p-4 ${!permit.fee_description ? "sm:col-span-2" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-khatulistiwa-300" aria-hidden="true" />
                <p className="text-khatulistiwa-200 text-xs font-bold uppercase tracking-wider">Dasar Hukum</p>
              </div>
              <ul className="space-y-1">
                {permit.legal_basis.map((lb, i) => (
                  <li key={i} className="text-khatulistiwa-300/70 text-xs">{lb}</li>
                ))}
              </ul>
            </div>
          )}

          {permit.complaint_info && (
            <div className="rounded-xl bg-khatulistiwa-900/50 border border-khatulistiwa-700/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-status-success" aria-hidden="true" />
                <p className="text-khatulistiwa-200 text-xs font-bold uppercase tracking-wider">Pengaduan</p>
              </div>
              <p className="text-khatulistiwa-300/70 text-xs">{permit.complaint_info}</p>
            </div>
          )}
        </motion.div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-khatulistiwa-900/50 border border-khatulistiwa-700/20 p-6 text-center">
          <p className="text-white font-display font-bold text-base mb-1">
            {isAuthenticated ? "Siap memulai?" : "Belum punya akun?"}
          </p>
          <p className="text-khatulistiwa-300/55 text-sm mb-5">
            {isAuthenticated
              ? `Ajukan ${permit.name} sekarang — prosesnya sepenuhnya digital.`
              : "Daftar gratis dan ajukan izin secara online — tanpa perlu datang ke kantor."}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to={applyHref}
              className="inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                         text-white px-6 py-3 text-sm font-semibold transition-colors"
            >
              {isAuthenticated ? "Ajukan Permohonan" : "Daftar Gratis"}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06]
                           text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.12] transition-colors"
              >
                Sudah punya akun? Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
