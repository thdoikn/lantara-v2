import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  Clock, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Scale, AlertCircle, Users, Plus,
  Sparkles, MessageCircle, CreditCard, ExternalLink,
  Briefcase, Globe, Mail, Instagram, Megaphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import BatangBanyu from "@/components/BatangBanyu";
import LantaraLoader from "@/components/LantaraLoader";
import { useAuthStore } from "@/lib/auth";
import { CONTACT_CHANNELS, type ContactChannelKey } from "@/lib/contact";
import { formatActorRole } from "@/lib/labels";
import api from "@/lib/api";
import type { PermitType } from "@/types";

const CONTACT_ICONS: Record<ContactChannelKey, LucideIcon> = {
  whatsapp: MessageCircle,
  website: Globe,
  email: Mail,
  instagram: Instagram,
  sp4n: Megaphone,
};

// Treat empty / "gratis" / "Rp 0" fee descriptions as free; otherwise the izin
// actually charges and we must show the real fee instead of a hardcoded Rp 0.
function isFreeFee(fee?: string): boolean {
  if (!fee || !fee.trim()) return true;
  return /gratis|tanpa biaya|tanpa dipungut|tidak dipungut|rp\.?\s*0\b|nol rupiah/i.test(fee);
}

export default function PermitDetailPage() {
  const { permitKey } = useParams<{ permitKey: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: permit, isLoading, isError } = useQuery<PermitType>({
    queryKey: ["permit-types", permitKey],
    queryFn: () => api.get(`/permit-types/${permitKey}/`).then((r) => r.data),
    enabled: !!permitKey,
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-khatulistiwa-950">
        <PublicNav />
        <LantaraLoader variant="inline" dark />
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

  const free = isFreeFee(permit.fee_description);
  // OSS-covered izin are NOT processed in Lantara (PRD §14) — route the citizen out.
  const isOss = permit.oss_covered;
  const ossUrl = permit.oss_deeplink || "https://oss.go.id";
  const applyHref = isAuthenticated ? `/portal/new/${permitKey}` : "/auth/register";

  // Primary CTA — external (OSS) vs internal application.
  function PrimaryCTA({ className, children }: { className: string; children: React.ReactNode }) {
    return isOss ? (
      <a href={ossUrl} target="_blank" rel="noreferrer" className={className}>{children}</a>
    ) : (
      <Link to={applyHref} className={className}>{children}</Link>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-pertiwi-warm">
      <PublicNav />

      {/* ── Dark hero header ── */}
      <div className="relative overflow-hidden bg-gradient-hero">
        <BatangBanyu variant="fill" opacity={0.05} className="text-terakota-400" />
        <div className="relative z-10 max-w-5xl mx-auto px-8 pt-28 pb-14">
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

              {/* Authoritative pills */}
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <div className="flex items-center gap-2 bg-terakota-500/15 border border-terakota-500/30 rounded-full px-4 py-2">
                  <Clock className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                  <span className="text-terakota-300 text-sm font-semibold">{permit.sla_days} hari kerja</span>
                </div>
                {free ? (
                  <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-4 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300 text-sm font-semibold">Rp 0 — Gratis</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2">
                    <CreditCard className="w-4 h-4 text-khatulistiwa-200" aria-hidden="true" />
                    <span className="text-khatulistiwa-100 text-sm font-semibold">Berbayar</span>
                  </div>
                )}
                {isOss && (
                  <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-2">
                    <ExternalLink className="w-4 h-4 text-amber-300" aria-hidden="true" />
                    <span className="text-amber-200 text-sm font-semibold">Diproses via OSS</span>
                  </div>
                )}
                {permit.is_berusaha && !isOss && (
                  <div
                    className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2"
                    title="Perizinan berusaha — memerlukan Nomor Induk Berusaha (NIB) dari sistem OSS"
                  >
                    <Briefcase className="w-4 h-4 text-khatulistiwa-200" aria-hidden="true" />
                    <span className="text-khatulistiwa-100 text-sm font-semibold">Perizinan Berusaha · perlu NIB</span>
                  </div>
                )}
              </div>
            </div>

            {/* High-authority CTA button */}
            <div className="shrink-0 flex flex-col items-end gap-2 mt-2">
              <PrimaryCTA
                className="flex items-center gap-3 bg-terakota-500 hover:bg-terakota-400 text-khatulistiwa-900
                           font-display font-black px-8 py-4 rounded-2xl transition-all duration-200 text-base
                           shadow-[0_8px_32px_rgba(219,175,108,0.4)] hover:shadow-[0_12px_40px_rgba(219,175,108,0.5)]
                           hover:-translate-y-0.5"
              >
                {isOss ? <ExternalLink className="w-5 h-5" aria-hidden="true" /> : <Plus className="w-5 h-5" aria-hidden="true" />}
                {isOss ? "Lanjut ke OSS" : "Ajukan Izin Ini"}
              </PrimaryCTA>
              <p className="text-khatulistiwa-300/40 text-xs">
                {isOss ? "Dikelola di sistem OSS nasional" : "Daftar gratis · Proses sepenuhnya digital"}
              </p>
            </div>
          </div>
        </div>

        {/* Curved wave transition to cream — tokenized */}
        <div className="text-pertiwi-warm" aria-hidden="true">
          <svg viewBox="0 0 1440 32" className="w-full block" preserveAspectRatio="none" style={{ height: "32px" }}>
            <path d="M0,32 L0,0 Q720,32 1440,0 L1440,32 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── Two-column content ── */}
      <div className="max-w-5xl mx-auto px-8 py-10 pb-28 lg:pb-10">
        {/* OSS route-out notice */}
        {isOss && (
          <div className="mb-7 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
            <ExternalLink className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-amber-900 font-semibold text-sm">Izin ini diproses melalui sistem OSS</p>
              <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">
                Perizinan berusaha ini dikelola oleh sistem Online Single Submission (OSS) nasional.
                Lantara menampilkan informasinya, namun permohonan dilakukan di OSS.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-7">

          {/* ── LEFT COL (3/5): Documents + Info strip ── */}
          <div className="lg:col-span-3 space-y-5">

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
              <motion.ul
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="space-y-3"
              >
                {requiredDocs.map((doc, i) => (
                  <li
                    key={doc.id}
                    className="bg-white rounded-2xl border border-pertiwi-muted shadow-sm p-5 flex gap-4 items-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-khatulistiwa-600 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white font-bold text-xs">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-khatulistiwa-900 font-semibold text-sm">{doc.title}</h4>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          Wajib
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-khatulistiwa-500/70 text-xs mt-1.5 leading-relaxed">{doc.description}</p>
                      )}
                      {doc.allowed_types?.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
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
                  </li>
                ))}

                {optionalDocs.length > 0 && (
                  <>
                    <p className="text-khatulistiwa-400/50 text-xs font-bold uppercase tracking-wider pt-2 pb-1">
                      Dokumen Opsional
                    </p>
                    {optionalDocs.map((doc, i) => (
                      <li
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
                      </li>
                    ))}
                  </>
                )}
              </motion.ul>
            )}

            {/* Info strip */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4 mt-6"
            >
              {/* Row 1: Biaya + Pengaduan */}
              <div className={`grid gap-4 ${permit.complaint_info ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {/* Biaya — derived from fee_description */}
                <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Biaya</p>
                  </div>
                  {free ? (
                    <>
                      <p className="text-white font-display font-black text-2xl">Rp 0</p>
                      <p className="text-khatulistiwa-300/50 text-xs mt-1">
                        {permit.fee_description || "Tidak dipungut biaya"}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                        <span className="text-emerald-400 text-xs font-medium">Tanpa biaya tersembunyi</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-white text-sm leading-relaxed">{permit.fee_description}</p>
                  )}
                </div>

                {/* Pengaduan — official channels (structured, not a wall of text) */}
                <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Pengaduan</p>
                  </div>
                  <ul className="space-y-1.5">
                    {CONTACT_CHANNELS.map((c) => {
                      const Icon = CONTACT_ICONS[c.key];
                      const primary = c.key === "whatsapp";
                      return (
                        <li key={c.key}>
                          <a
                            href={c.href}
                            {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                            className={
                              primary
                                ? "flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                                : "flex items-center gap-2 px-1 py-1 text-xs text-khatulistiwa-200/70 hover:text-white transition-colors"
                            }
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${primary ? "" : "text-terakota-400/70"}`} aria-hidden="true" />
                            <span className={primary ? "" : "text-khatulistiwa-300/45"}>{c.label}</span>
                            <span className="truncate">{c.value}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Row 2: Dasar Hukum */}
              {permit.legal_basis && permit.legal_basis.length > 0 && (
                <div className="bg-khatulistiwa-900 rounded-2xl p-5 border border-khatulistiwa-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                    <p className="text-terakota-400 text-xs font-bold tracking-[0.15em] uppercase">Dasar Hukum</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {permit.legal_basis.map((lb) => (
                      <div key={lb} className="flex items-start gap-2">
                        <span className="text-terakota-500/60 text-xs mt-0.5 shrink-0">§</span>
                        <p className="text-khatulistiwa-200/65 text-xs leading-relaxed text-justify">{lb}</p>
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

              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-khatulistiwa-800 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-terakota-400" aria-hidden="true" />
                </div>
                <h2 className="text-khatulistiwa-900 font-display font-bold text-xl">Alur Proses</h2>
              </div>

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
                          : `${Math.max(1, Math.round(stage.sla_hours / 8))} hari kerja`)
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

                              {stage.actor_role && (
                                <p className={`text-xs mt-0.5 font-medium ${isFirst ? "text-terakota-300/80" : "text-khatulistiwa-400/60"}`}>
                                  {formatActorRole(stage.actor_role)}
                                </p>
                              )}

                              {slaLabel && (
                                <div className="flex items-center gap-1.5 mt-2.5">
                                  <Clock className="w-3 h-3 text-terakota-400/70" aria-hidden="true" />
                                  <span className="text-terakota-400/80 text-xs font-medium">{slaLabel}</span>
                                </div>
                              )}

                              {stage.instructions && (
                                <p className="text-khatulistiwa-300/50 text-xs mt-2 leading-relaxed text-justify">{stage.instructions}</p>
                              )}
                            </div>
                          </div>
                        </div>

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

              {/* Sticky CTA panel (desktop) */}
              <div className="hidden lg:block rounded-2xl overflow-hidden border border-khatulistiwa-200/60 shadow-lg mt-5">
                <div className="bg-terakota-500 px-5 py-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-khatulistiwa-900" aria-hidden="true" />
                  <p className="text-khatulistiwa-900 font-display font-bold text-sm">
                    {isOss ? "Diproses via OSS" : "Siap mengajukan?"}
                  </p>
                </div>
                <div className="bg-white px-5 py-5">
                  <p className="text-khatulistiwa-500/70 text-xs leading-relaxed mb-4">
                    {isOss
                      ? "Permohonan izin ini dilakukan di sistem OSS nasional."
                      : isAuthenticated
                        ? "Mulai permohonan Anda — proses sepenuhnya digital."
                        : "Daftar gratis dan ajukan izin ini secara digital — tanpa perlu datang ke kantor."}
                  </p>
                  <PrimaryCTA
                    className="flex items-center justify-center gap-2 w-full bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                               text-white font-display font-bold py-3.5 rounded-xl transition-all
                               shadow-md shadow-khatulistiwa-600/20 hover:shadow-khatulistiwa-500/30 mb-2.5"
                  >
                    {isOss ? "Buka OSS" : isAuthenticated ? "Ajukan Permohonan" : "Daftar & Ajukan"}
                    {isOss ? <ExternalLink className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                  </PrimaryCTA>
                  {!isOss && !isAuthenticated && (
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

      {/* Mobile sticky apply bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-pertiwi-muted px-4 py-3 shadow-[0_-4px_20px_rgba(13,31,92,0.10)]">
        <PrimaryCTA
          className="flex items-center justify-center gap-2 w-full bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                     text-white font-display font-bold py-3.5 rounded-xl transition-all"
        >
          {isOss ? "Lanjut ke OSS" : isAuthenticated ? "Ajukan Permohonan" : "Daftar & Ajukan"}
          {isOss ? <ExternalLink className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
        </PrimaryCTA>
      </div>
    </main>
  );
}
