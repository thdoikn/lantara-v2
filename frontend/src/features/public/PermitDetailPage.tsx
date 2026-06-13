import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  Clock, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Banknote, Scale, AlertCircle, Loader2, Users, Plus,
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

  const applyHref = isAuthenticated ? `/portal/new/${permitKey}` : `/auth/register`;

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
            ← Kembali ke Katalog
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
    <main id="main-content" className="min-h-screen bg-pertiwi-warm">
      <PublicNav />

      {/* ── Dark hero header ── */}
      <div
        className="relative"
        style={{ background: "linear-gradient(160deg, #04182A 0%, #0A2540 70%)" }}
      >
        <div className="max-w-5xl mx-auto px-8 pt-28 pb-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-khatulistiwa-300/40 mb-6 flex-wrap" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-terakota-400 transition-colors">Lantara</Link>
            <span aria-hidden="true">/</span>
            <Link to="/layanan" className="hover:text-terakota-400 transition-colors">Katalog Layanan</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/50 truncate max-w-xs">{permit.name}</span>
          </nav>

          <div className="flex items-start justify-between gap-8 flex-wrap">
            {/* Left: permit title + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-terakota-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
                {permit.sektor_name}
              </p>
              <h1 className="text-white font-display font-black text-4xl md:text-5xl leading-tight max-w-2xl">
                {permit.name}
              </h1>

              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <div className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.12] rounded-full px-4 py-2">
                  <Clock className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                  <span className="text-white text-sm font-semibold">{permit.sla_days} hari kerja</span>
                </div>
                {permit.fee_description && (
                  <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-4 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300 text-sm font-semibold">{permit.fee_description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: CTA button */}
            <div className="shrink-0 mt-2">
              <Link
                to={applyHref}
                className="flex items-center gap-3 bg-terakota-500 hover:bg-terakota-400 text-khatulistiwa-900
                           font-display font-bold px-8 py-4 rounded-2xl transition-all
                           shadow-xl shadow-terakota-500/30 hover:shadow-terakota-400/40 hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                {isAuthenticated ? "Ajukan Izin Ini" : "Daftar & Ajukan"}
              </Link>
              <p className="text-khatulistiwa-300/40 text-xs text-center mt-2">
                {isAuthenticated ? "Proses sepenuhnya digital" : "Daftar gratis, proses digital"}
              </p>
            </div>
          </div>
        </div>

        {/* Curved wave transition to cream */}
        <svg
          viewBox="0 0 1440 32"
          className="w-full block"
          preserveAspectRatio="none"
          style={{ height: "32px" }}
          aria-hidden="true"
        >
          <path d="M0,32 L0,0 Q720,32 1440,0 L1440,32 Z" fill="#F5F0E8" />
        </svg>
      </div>

      {/* ── Two-column content — cream bg ── */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-7">

          {/* ── LEFT COL (3/5): Documents + Info strip ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Section heading */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-khatulistiwa-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-terakota-400" aria-hidden="true" />
              </div>
              <h2 className="text-khatulistiwa-900 font-display font-bold text-xl">
                Persyaratan Dokumen
              </h2>
            </div>

            {sortedDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-pertiwi-muted shadow-sm p-6 text-center">
                <p className="text-khatulistiwa-500/60 text-sm">Belum ada persyaratan dokumen terdaftar.</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="space-y-3"
              >
                {requiredDocs.map((doc, i) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-pertiwi-muted shadow-sm p-5 flex gap-4 items-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-khatulistiwa-50 border border-khatulistiwa-100
                                    flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-khatulistiwa-600 font-bold text-xs">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-khatulistiwa-900 font-semibold text-sm">{doc.title}</h4>
                        <span className="bg-red-50 text-red-500 border border-red-100 text-xs px-2 py-0.5 rounded-full font-medium">
                          Wajib
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-khatulistiwa-500/70 text-xs mt-1.5 leading-relaxed">{doc.description}</p>
                      )}
                      {doc.allowed_types?.length > 0 && (
                        <div className="flex items-center gap-3 mt-2.5">
                          <span className="bg-khatulistiwa-50 text-khatulistiwa-500 text-xs px-2.5 py-1 rounded-lg border border-khatulistiwa-100">
                            {doc.allowed_types.join(", ").toUpperCase()}
                          </span>
                          {doc.max_bytes > 0 && (
                            <span className="text-khatulistiwa-400/50 text-xs">
                              Maks {Math.round(doc.max_bytes / 1024 / 1024)} MB
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {optionalDocs.length > 0 && (
                  <>
                    <p className="text-khatulistiwa-400/50 text-xs font-bold uppercase tracking-wider pt-2 pb-1">
                      Dokumen Opsional
                    </p>
                    {optionalDocs.map((doc, i) => (
                      <div
                        key={doc.id}
                        className="bg-white/70 rounded-2xl border border-pertiwi-muted p-5 flex gap-4 items-start opacity-80"
                      >
                        <div className="w-8 h-8 rounded-full bg-khatulistiwa-50/60 border border-khatulistiwa-100/60
                                        flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-khatulistiwa-400 font-bold text-xs">{requiredDocs.length + i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-khatulistiwa-700 font-semibold text-sm">{doc.title}</h4>
                          {doc.description && (
                            <p className="text-khatulistiwa-500/60 text-xs mt-1 leading-relaxed">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {/* ── Info strip: Biaya / Dasar Hukum / Pengaduan — dark cards ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid sm:grid-cols-3 gap-4 pt-2"
            >
              {permit.fee_description && (
                <div className="bg-khatulistiwa-900 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Biaya</p>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{permit.fee_description}</p>
                </div>
              )}

              {permit.legal_basis && permit.legal_basis.length > 0 && (
                <div className={`bg-khatulistiwa-900 rounded-2xl p-5 ${!permit.fee_description && !permit.complaint_info ? "sm:col-span-3" : !permit.fee_description || !permit.complaint_info ? "sm:col-span-2" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Dasar Hukum</p>
                  </div>
                  <ul className="space-y-1">
                    {permit.legal_basis.map((lb, i) => (
                      <li key={i} className="text-khatulistiwa-300/70 text-xs leading-relaxed">{lb}</li>
                    ))}
                  </ul>
                </div>
              )}

              {permit.complaint_info && (
                <div className="bg-khatulistiwa-900 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Pengaduan</p>
                  </div>
                  <p className="text-khatulistiwa-300/70 text-xs leading-relaxed">{permit.complaint_info}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT COL (2/5): Alur Proses — sticky ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-3">

              {/* Section heading */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-khatulistiwa-800 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                </div>
                <h2 className="text-khatulistiwa-900 font-display font-bold text-xl">Alur Proses</h2>
              </div>

              {/* Stage cards — dark on cream */}
              {sortedStages.length === 0 ? (
                <div className="bg-khatulistiwa-900 rounded-2xl p-5">
                  <p className="text-khatulistiwa-400/60 text-sm">Belum ada alur proses terdaftar.</p>
                </div>
              ) : (
                <ol aria-label="Tahapan proses perizinan" className="space-y-3">
                  {sortedStages.map((stage, i) => {
                    const isLast = i === sortedStages.length - 1;
                    return (
                      <li key={stage.id} className="relative">
                        <div className="bg-khatulistiwa-900 rounded-2xl p-4 relative overflow-hidden">
                          {/* Terakota top accent on first step */}
                          {i === 0 && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-terakota-500/60" aria-hidden="true" />
                          )}

                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-khatulistiwa-700 border border-khatulistiwa-600
                                            flex items-center justify-center shrink-0">
                              <span className="text-terakota-400 font-bold text-xs">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-display font-semibold text-sm leading-snug">{stage.name}</p>
                              {stage.actor_role && (
                                <p className="text-khatulistiwa-300/60 text-xs mt-0.5">{stage.actor_role}</p>
                              )}
                              {stage.sla_hours > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Clock className="w-3 h-3 text-terakota-400/60" aria-hidden="true" />
                                  <span className="text-terakota-400/80 text-xs">
                                    {stage.sla_hours < 24
                                      ? `${stage.sla_hours} jam`
                                      : `${Math.round(stage.sla_hours / 8)} hari kerja`}
                                  </span>
                                </div>
                              )}
                              {stage.instructions && (
                                <p className="text-khatulistiwa-400/50 text-xs mt-1.5 leading-relaxed">{stage.instructions}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Connector line between cards */}
                        {!isLast && (
                          <div
                            className="absolute -bottom-1.5 left-[1.65rem] w-px h-4 bg-khatulistiwa-700"
                            aria-hidden="true"
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Sticky CTA card — white on cream */}
              <div className="bg-white rounded-2xl border border-pertiwi-muted shadow-sm p-5 text-center mt-5">
                <p className="text-khatulistiwa-900 font-display font-bold text-base">
                  {isAuthenticated ? "Siap mengajukan?" : "Belum punya akun?"}
                </p>
                <p className="text-khatulistiwa-400/70 text-xs mt-1 mb-4">
                  {isAuthenticated
                    ? "Mulai permohonan — proses sepenuhnya digital."
                    : "Daftar gratis dan ajukan izin tanpa perlu datang ke kantor."}
                </p>
                <Link
                  to={applyHref}
                  className="flex items-center justify-center gap-2 w-full bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                             text-white font-display font-bold py-3 rounded-xl transition-all
                             shadow-md shadow-khatulistiwa-600/30"
                >
                  {isAuthenticated ? "Ajukan Permohonan" : "Daftar & Ajukan"}
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/auth/login"
                    className="flex items-center justify-center w-full mt-2 border border-khatulistiwa-200
                               text-khatulistiwa-600 font-semibold py-2.5 rounded-xl text-sm
                               hover:bg-khatulistiwa-50 transition-all"
                  >
                    Sudah punya akun? Masuk
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
