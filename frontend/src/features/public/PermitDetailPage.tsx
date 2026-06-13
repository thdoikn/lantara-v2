import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  Clock, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Scale, AlertCircle, Loader2, Users, Plus,
  Sparkles, MessageCircle, CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";
import type { PermitType } from "@/types";

// Role label translations (Bahasa Indonesia)
const ROLE_LABELS: Record<string, string> = {
  applicant: "Pemohon",
  verifier:  "Tim Verifikator Teknis",
  approver:  "Kepala Otorita IKN",
  staff:     "Petugas Loket / WhatsApp",
};
function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

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
  const sortedDocs   = [...(permit.doc_requirements ?? [])].sort((a, b) => a.order - b.order);
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
            {/* Left: title + pills */}
            <div className="flex-1 min-w-0">
              <p className="text-terakota-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
                {permit.sektor_name}
              </p>
              <h1 className="text-white font-display font-black text-4xl md:text-5xl leading-tight max-w-2xl">
                {permit.name}
              </h1>

              {/* FIX 1 — authoritative pills */}
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <div className="flex items-center gap-2 bg-terakota-500/15 border border-terakota-500/30 rounded-full px-4 py-2">
                  <Clock className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                  <span className="text-terakota-300 text-sm font-semibold">{permit.sla_days} hari kerja</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-4 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300 text-sm font-semibold">Rp 0 — Gratis</span>
                </div>
              </div>
            </div>

            {/* FIX 1 — high-authority CTA button */}
            <div className="shrink-0 flex flex-col items-end gap-2 mt-2">
              <Link
                to={applyHref}
                className="flex items-center gap-3 bg-terakota-500 hover:bg-terakota-400 text-[#0A2540]
                           font-display font-black px-8 py-4 rounded-2xl transition-all duration-200 text-base
                           shadow-[0_8px_32px_rgba(219,175,108,0.4)] hover:shadow-[0_12px_40px_rgba(219,175,108,0.5)]
                           hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                Ajukan Izin Ini
              </Link>
              <p className="text-khatulistiwa-300/40 text-xs">Daftar gratis · Proses sepenuhnya digital</p>
            </div>
          </div>
        </div>

        {/* Curved wave transition to cream — unchanged */}
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

            {/* FIX 2 — compact section heading */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-khatulistiwa-800 flex items-center justify-center shrink-0">
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
                    {/* FIX 6 — solid dark circle */}
                    <div className="w-8 h-8 rounded-full bg-khatulistiwa-600 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white font-bold text-xs">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-khatulistiwa-900 font-semibold text-sm">{doc.title}</h4>
                        {/* FIX 6 — solid filled "Wajib" badge */}
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          Wajib
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-khatulistiwa-500/70 text-xs mt-1.5 leading-relaxed">{doc.description}</p>
                      )}
                      {doc.allowed_types?.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          {/* FIX 6 — monospace format tags */}
                          {doc.allowed_types.map((fmt) => (
                            <span
                              key={fmt}
                              className="bg-khatulistiwa-50 text-khatulistiwa-600 border border-khatulistiwa-200 text-xs px-2.5 py-1 rounded-lg font-mono font-medium"
                            >
                              {fmt.toUpperCase()}
                            </span>
                          ))}
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
                        <div className="w-8 h-8 rounded-full bg-khatulistiwa-50/60 border border-khatulistiwa-100/60 flex items-center justify-center shrink-0 mt-0.5">
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

            {/* Info strip: Biaya+Pengaduan row, then Dasar Hukum full-width */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4 mt-6"
            >
              {/* Row 1: Biaya + Pengaduan */}
              <div className={`grid gap-4 ${permit.complaint_info ? "grid-cols-2" : "grid-cols-1"}`}>
                {/* Biaya — always shown */}
                <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Biaya</p>
                  </div>
                  <p className="text-white font-display font-black text-2xl">Rp 0</p>
                  <p className="text-khatulistiwa-300/50 text-xs mt-1">
                    {permit.fee_description || "Gratis s/d 2035"}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="text-emerald-400 text-xs font-medium">Tanpa biaya tersembunyi</span>
                  </div>
                </div>

                {/* Pengaduan */}
                {permit.complaint_info && (
                  <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                      <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Pengaduan</p>
                    </div>
                    <p className="text-khatulistiwa-200/70 text-xs leading-relaxed mb-3">{permit.complaint_info}</p>
                    <a
                      href="https://wa.me/6280000000000"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300
                                 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      WhatsApp Satu Nomor IKN
                    </a>
                  </div>
                )}
              </div>

              {/* Row 2: Dasar Hukum — full width */}
              {permit.legal_basis && permit.legal_basis.length > 0 && (
                <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Dasar Hukum</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {permit.legal_basis.map((lb, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-terakota-500/60 text-xs mt-0.5 shrink-0">§</span>
                        <p className="text-khatulistiwa-200/65 text-xs leading-relaxed">{lb}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT COL (2/5): Alur Proses — sticky ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">

              {/* FIX 2 — compact section heading */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-khatulistiwa-800 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                </div>
                <h2 className="text-khatulistiwa-900 font-display font-bold text-xl">Alur Proses</h2>
              </div>

              {/* FIX 3 — differentiated stage cards */}
              {sortedStages.length === 0 ? (
                <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                  <p className="text-khatulistiwa-400/60 text-sm">Belum ada alur proses terdaftar.</p>
                </div>
              ) : (
                <ol aria-label="Tahapan proses perizinan">
                  {sortedStages.map((stage, i) => {
                    const isFirst = i === 0;
                    const isLast  = i === sortedStages.length - 1;
                    const slaLabel = stage.sla_hours > 0
                      ? (stage.sla_hours < 24
                          ? `${stage.sla_hours} jam`
                          : `${Math.round(stage.sla_hours / 8)} hari kerja`)
                      : null;

                    return (
                      <li key={stage.id} className="relative">
                        <div
                          className={`rounded-2xl p-5 border transition-all ${
                            isFirst
                              ? "bg-khatulistiwa-700 border-khatulistiwa-500/50 shadow-[0_0_0_1px_rgba(30,107,168,0.3)]"
                              : "bg-khatulistiwa-900 border-khatulistiwa-700/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Step number — highlighted for first step */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-sm ${
                                isFirst
                                  ? "bg-terakota-500 text-khatulistiwa-900"
                                  : "bg-khatulistiwa-700 border border-khatulistiwa-600 text-terakota-400"
                              }`}
                            >
                              {i + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-white font-display font-bold text-sm leading-snug">{stage.name}</p>

                              {/* FIX 3 — role in Bahasa Indonesia */}
                              {stage.actor_role && (
                                <p className={`text-xs mt-0.5 font-medium ${isFirst ? "text-terakota-300/80" : "text-khatulistiwa-400/60"}`}>
                                  {formatRole(stage.actor_role)}
                                </p>
                              )}

                              {/* SLA */}
                              {slaLabel && (
                                <div className="flex items-center gap-1.5 mt-2.5">
                                  <Clock className="w-3 h-3 text-terakota-400/70" aria-hidden="true" />
                                  <span className="text-terakota-400/80 text-xs font-medium">{slaLabel}</span>
                                </div>
                              )}

                              {/* Instructions / description */}
                              {stage.instructions && (
                                <p className="text-khatulistiwa-300/50 text-xs mt-2 leading-relaxed">{stage.instructions}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* FIX 3 — flow connector between cards */}
                        {!isLast && (
                          <div className="flex items-center justify-start ml-9 my-1" aria-hidden="true">
                            <div className="w-px h-4 bg-khatulistiwa-700" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* FIX 5 — redesigned sticky CTA panel */}
              <div className="rounded-2xl overflow-hidden border border-khatulistiwa-200/60 shadow-lg mt-5">
                {/* Terakota accent band */}
                <div className="bg-terakota-500 px-5 py-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-khatulistiwa-900" aria-hidden="true" />
                  <p className="text-khatulistiwa-900 font-display font-bold text-sm">Siap mengajukan?</p>
                </div>

                {/* White content area */}
                <div className="bg-white px-5 py-5">
                  <p className="text-khatulistiwa-500/70 text-xs leading-relaxed mb-4">
                    {isAuthenticated
                      ? "Mulai permohonan Anda — proses sepenuhnya digital."
                      : "Daftar gratis dan ajukan izin ini secara digital — tanpa perlu datang ke kantor."}
                  </p>
                  <Link
                    to={applyHref}
                    className="flex items-center justify-center gap-2 w-full bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                               text-white font-display font-bold py-3.5 rounded-xl transition-all
                               shadow-md shadow-khatulistiwa-600/20 hover:shadow-khatulistiwa-500/30 mb-2.5"
                  >
                    {isAuthenticated ? "Ajukan Permohonan" : "Daftar & Ajukan"}
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  {!isAuthenticated && (
                    <Link
                      to="/auth/login"
                      className="flex items-center justify-center w-full bg-khatulistiwa-50 hover:bg-khatulistiwa-100
                                 text-khatulistiwa-700 font-semibold py-3 rounded-xl text-sm transition-all
                                 border border-khatulistiwa-200"
                    >
                      Sudah punya akun? Masuk
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
