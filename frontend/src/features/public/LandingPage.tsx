import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Clock, Shield, Smartphone, CheckCircle2,
  ChevronDown, Search, MessageCircle, Building2, FileText, Check,
} from "lucide-react";
import api from "@/lib/api";
import { getSektorVisual } from "@/lib/sektorVisuals";
import PublicNav from "@/components/PublicNav";
import type { Sektor } from "@/types";

// ── Batik interlocked-chain ornament (IKN motif) ───────────────────────────────

function BatikBorder({ flip = false, opacity = 1 }: { flip?: boolean; opacity?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <div style={{ width: "100%", height: "56px", transform: flip ? "scaleY(-1)" : "none", flexShrink: 0, lineHeight: 0 }} aria-hidden="true">
      <svg width="100%" height="56" viewBox="0 0 1440 56" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
        <defs>
          <pattern id={`batik-${id}`} x="0" y="0" width="96" height="56" patternUnits="userSpaceOnUse">
            <ellipse cx="48" cy="28" rx="44" ry="22" fill="none" stroke="#DBAF6C" strokeWidth="1.5" opacity="0.7" />
            <ellipse cx="48" cy="28" rx="32" ry="14" fill="none" stroke="#DBAF6C" strokeWidth="1" opacity="0.5" />
            <ellipse cx="48" cy="28" rx="10" ry="6" fill="none" stroke="#DBAF6C" strokeWidth="1" opacity="0.6" />
            <ellipse cx="4" cy="28" rx="8" ry="5" fill="#04182A" stroke="#DBAF6C" strokeWidth="1.5" opacity="0.7" />
            <ellipse cx="92" cy="28" rx="8" ry="5" fill="#04182A" stroke="#DBAF6C" strokeWidth="1.5" opacity="0.7" />
            <circle cx="48" cy="6" r="2" fill="#DBAF6C" opacity="0.5" />
            <circle cx="48" cy="50" r="2" fill="#DBAF6C" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="1440" height="56" fill={`url(#batik-${id})`} />
      </svg>
    </div>
  );
}

// ── Section wave transition ────────────────────────────────────────────────────

function WaveTransition({ from, to }: { from: string; to: string }) {
  return (
    <div
      style={{ background: from, height: "40px", overflow: "hidden", marginBottom: "-1px", lineHeight: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 40" width="100%" height="40" preserveAspectRatio="none">
        <path d="M0,40 L0,0 Q720,40 1440,0 L1440,40 Z" fill={to} />
      </svg>
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────

const HERO_BG = `
  radial-gradient(ellipse 60% 50% at 20% 50%, rgba(24,80,136,0.25) 0%, transparent 60%),
  radial-gradient(ellipse 50% 40% at 80% 30%, rgba(24,80,136,0.15) 0%, transparent 55%),
  radial-gradient(ellipse 80% 60% at 50% 110%, rgba(24,80,136,0.3) 0%, transparent 65%),
  #04182A`;

function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: HERO_BG }}
      aria-label="Hero Lantara"
    >
      <div className="absolute inset-0 dot-grid opacity-[0.04] text-white pointer-events-none" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-4 text-center flex flex-col items-center pb-16"
      >
        <h1
          className="font-display font-black text-white text-7xl md:text-9xl tracking-tight leading-none"
          style={{ textShadow: "0 0 80px rgba(46,133,200,0.35)" }}
        >
          Lantara
        </h1>

        <p className="text-xl md:text-2xl font-display font-medium text-khatulistiwa-200/80 mt-6 max-w-[600px]">
          Layanan Perizinan Digital Ibu Kota Nusantara
        </p>
        <p className="text-base text-white/50 mt-4 max-w-[480px] leading-relaxed">
          Satu portal untuk mengajukan, memantau, dan menerima izin Anda — cepat, transparan, dan sepenuhnya digital.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link
            to="/auth/register"
            className="group inline-flex items-center justify-center gap-2 bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white rounded-xl px-8 py-3.5 font-semibold transition-all shadow-[0_8px_30px_rgba(24,80,136,0.4)]"
          >
            Ajukan Izin Sekarang
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <Link
            to="/layanan"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl px-8 py-3.5 font-semibold transition-all"
          >
            Lihat Katalog
          </Link>
        </div>

        {/* Live status pills */}
        <div className="mt-16 flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-full px-5 py-2.5 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-jagawana-400 shadow-[0_0_8px_rgba(94,168,92,0.8)] animate-pulse" />
            <span className="text-white/70 text-sm font-medium">Sistem Aktif</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-full px-5 py-2.5 backdrop-blur-sm">
            <span className="text-terakota-500 text-sm font-bold">46+</span>
            <span className="text-white/70 text-sm">Jenis Izin Tersedia</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-full px-5 py-2.5 backdrop-blur-sm">
            <span className="text-terakota-500 text-sm font-bold">Rp 0</span>
            <span className="text-white/70 text-sm">Biaya Layanan</span>
          </div>
        </div>

        {/* Decorative permit card preview — fills hero dead space */}
        <div className="mt-12 max-w-lg mx-auto w-full">
          <div className="bg-white/[0.06] border border-white/[0.12] rounded-2xl p-5 backdrop-blur-sm text-left" aria-hidden="true">
            {/* Card header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-terakota-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-terakota-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white/80 font-semibold text-sm">Izin Pendirian Non Panti Sosial</p>
                  <p className="text-white/40 text-xs">Sektor Sosial · Direktorat P5</p>
                </div>
              </div>
              <span className="shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-semibold">
                Disetujui
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/40 mb-1.5">
                <span>Progres Permohonan</span>
                <span>3 / 4 tahap</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-khatulistiwa-400 to-terakota-400 rounded-full" />
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mt-3">
              {["Pengajuan", "Verifikasi", "Penerbitan", "Penyerahan"].map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      i < 3 ? "bg-emerald-500" : "bg-white/15 border border-white/20"
                    }`}
                  >
                    {i < 3 && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-xs truncate ${i < 3 ? "text-white/60" : "text-white/30"}`}>{step}</span>
                  {i < 3 && <div className="flex-1 h-px bg-emerald-500/30 min-w-0" />}
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/25 text-xs text-center mt-3">Contoh tampilan permohonan aktif</p>
        </div>
      </motion.div>

      <div className="absolute bottom-0 inset-x-0">
        <BatikBorder opacity={0.6} />
      </div>
    </section>
  );
}

// ── Stats strip ────────────────────────────────────────────────────────────────

const STATS = [
  { number: "31+", label: "Sektor Layanan", sub: "bidang perizinan" },
  { number: "Rp 0", label: "Biaya Perizinan", sub: "sepenuhnya gratis" },
  { number: "100%", label: "Proses Digital", sub: "tanpa tatap muka" },
  { number: "2045", label: "Visi IKN", sub: "kota masa depan" },
];

function StatsStrip() {
  return (
    <section className="bg-terakota-500 py-10">
      <div className="max-w-5xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-0">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`flex flex-col items-center text-center px-4 md:px-8 ${i < STATS.length - 1 ? "md:border-r border-khatulistiwa-800/25" : ""}`}
          >
            <span className="font-display font-black text-4xl md:text-5xl text-khatulistiwa-900 leading-none">{stat.number}</span>
            <span className="font-display font-bold text-khatulistiwa-800 text-base mt-2">{stat.label}</span>
            <span className="text-khatulistiwa-700/70 text-xs mt-1">{stat.sub}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Sektor cards — white on cream ──────────────────────────────────────────────

const LIGHT_SEKTOR_STYLES = [
  { topBar: "bg-khatulistiwa-600", iconBg: "bg-khatulistiwa-100", iconText: "text-khatulistiwa-600", badge: "bg-khatulistiwa-100 text-khatulistiwa-700" },
  { topBar: "bg-terakota-500",     iconBg: "bg-terakota-100",     iconText: "text-terakota-700",     badge: "bg-terakota-100 text-terakota-700" },
  { topBar: "bg-emerald-500",      iconBg: "bg-emerald-100",      iconText: "text-emerald-600",      badge: "bg-emerald-100 text-emerald-700" },
  { topBar: "bg-jagawana-500",     iconBg: "bg-jagawana-300/25",  iconText: "text-jagawana-600",     badge: "bg-jagawana-300/25 text-jagawana-600" },
];

function getLightSektorStyle(dotClass: string) {
  if (dotClass.includes("terakota")) return LIGHT_SEKTOR_STYLES[1];
  if (dotClass.includes("emerald"))  return LIGHT_SEKTOR_STYLES[2];
  if (dotClass.includes("jagawana")) return LIGHT_SEKTOR_STYLES[3];
  return LIGHT_SEKTOR_STYLES[0];
}

function SektorCards({ sektors }: { sektors: Sektor[] }) {
  return (
    <section className="bg-pertiwi-warm py-20">
      <div className="max-w-6xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-khatulistiwa-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">Layanan Kami</p>
          <h2 className="text-khatulistiwa-900 font-display font-black text-4xl md:text-5xl">Pilih Sektor Anda</h2>
          <p className="mt-4 text-khatulistiwa-600/60 max-w-md mx-auto text-base">
            31+ jenis izin tersedia secara digital, dikategori per sektor layanan.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {sektors.map((sektor, i) => {
            const v = getSektorVisual(sektor.key, sektor.name);
            const Icon = v.Icon;
            const ls = getLightSektorStyle(v.dot);
            return (
              <motion.div
                key={sektor.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                <Link
                  to={`/layanan#${sektor.key}`}
                  className="group flex flex-col h-full bg-white rounded-2xl border border-pertiwi-muted
                             shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
                >
                  {/* Sektor accent bar */}
                  <div className={`h-1 w-full shrink-0 ${ls.topBar}`} aria-hidden="true" />

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-12 h-12 rounded-2xl ${ls.iconBg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${ls.iconText}`} aria-hidden="true" />
                      </div>
                      <span className={`${ls.badge} text-xs font-bold px-3 py-1.5 rounded-full`}>
                        {sektor.permit_count} izin
                      </span>
                    </div>

                    <h3 className="text-khatulistiwa-900 font-display font-bold text-xl">{sektor.name}</h3>
                    <p className="text-khatulistiwa-500/70 text-sm mt-1.5 line-clamp-2 flex-1">
                      {sektor.pengampu || "Layanan perizinan sektor"}
                    </p>

                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-pertiwi-muted">
                      <span className="text-khatulistiwa-400/50 text-xs">Layanan aktif</span>
                      <span className="text-khatulistiwa-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Lihat Izin <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/layanan"
            className="inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white px-7 py-3.5 font-semibold transition-colors shadow-[0_8px_30px_rgba(24,80,136,0.3)]"
          >
            Lihat Semua Layanan
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── "Cari Layanan" search ──────────────────────────────────────────────────────

function SearchSection() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/layanan?q=${encodeURIComponent(q.trim())}` : "/layanan");
  }
  return (
    <section className="bg-khatulistiwa-900 py-14">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-white font-display font-bold text-2xl md:text-3xl mb-2">Cari Layanan</h2>
        <p className="text-khatulistiwa-300/50 text-sm mb-7">Temukan jenis izin berdasarkan sektor atau kode KBLI.</p>
        <form onSubmit={submit}>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari jenis izin, sektor, atau KBLI…"
              className="w-full bg-white/[0.07] border border-white/[0.12] rounded-2xl pl-14 pr-28 py-4
                         text-white placeholder-white/30 text-base outline-none
                         focus:border-terakota-400/50 focus:bg-white/[0.10] transition-all"
              aria-label="Cari layanan perizinan"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-khatulistiwa-600 hover:bg-khatulistiwa-500
                         text-white px-5 rounded-xl font-semibold text-sm transition-colors
                         flex items-center gap-2"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cari</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

// ── Cara Kerja — horizontal timeline on cream ──────────────────────────────────

const STEPS = [
  { title: "Daftar & Verifikasi", desc: "Buat akun dengan NIK dan email. Verifikasi dengan OTP satu langkah." },
  { title: "Pilih Jenis Izin", desc: "Cari izin dari katalog 31+ layanan, baca persyaratan lengkapnya." },
  { title: "Isi & Unggah", desc: "Lengkapi formulir dan dokumen digital secara online, kapan saja." },
  { title: "Pantau & Terima", desc: "Lacak proses real-time, terima notifikasi, unduh izin digital Anda." },
];

function HowItWorks() {
  return (
    <section className="bg-pertiwi-warm py-20 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-terakota-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">CARA KERJA</p>
          <h2 className="text-khatulistiwa-900 font-display font-black text-4xl md:text-5xl">Empat Langkah Mudah</h2>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Connector line — behind the circles */}
          <div
            className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5
                        bg-gradient-to-r from-khatulistiwa-200 via-terakota-400/50 to-khatulistiwa-200"
            aria-hidden="true"
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center relative"
            >
              {/* Dark number circle — contrasts against cream */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-khatulistiwa-800 border-4 border-pertiwi-warm
                              shadow-xl flex items-center justify-center mb-5">
                <span className="text-terakota-400 font-display font-black text-2xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* White card */}
              <div className="bg-white rounded-2xl border border-pertiwi-muted shadow-sm p-5 w-full">
                <h3 className="text-khatulistiwa-900 font-display font-bold text-base">{step.title}</h3>
                <p className="text-khatulistiwa-500/70 text-sm mt-2 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Mengapa Lantara — dark, redesigned cards ───────────────────────────────────

const FEATURES = [
  { Icon: Clock,        title: "SLA Transparan",       desc: "Setiap tahap punya batas waktu. Pantau kapan izin Anda akan selesai secara real-time." },
  { Icon: Shield,       title: "Dokumen Terverifikasi", desc: "Setiap izin digital dilengkapi QR code untuk validasi keaslian kapan saja, di mana saja." },
  { Icon: Smartphone,   title: "Notifikasi Aktif",      desc: "Pemberitahuan via email dan WhatsApp di setiap perubahan status permohonan Anda." },
  { Icon: CheckCircle2, title: "Tanpa Biaya Layanan",   desc: "Platform 100% gratis untuk masyarakat. Tidak ada biaya administrasi tersembunyi." },
];

function Features() {
  return (
    <section className="py-20 bg-khatulistiwa-950">
      <div className="max-w-5xl mx-auto px-8">
        <div className="text-center mb-14">
          <p className="text-terakota-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">Keunggulan</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Mengapa Lantara?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group relative bg-khatulistiwa-900/60 border border-khatulistiwa-700/30 rounded-2xl p-7
                         hover:border-terakota-500/40 hover:bg-khatulistiwa-800/60 transition-all duration-300 overflow-hidden"
            >
              {/* Corner glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-terakota-500/5 rounded-full blur-2xl group-hover:bg-terakota-500/10 transition-colors" aria-hidden="true" />

              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-terakota-500/10 border border-terakota-500/20 flex items-center justify-center mb-5 group-hover:bg-terakota-500/20 transition-colors">
                  <Icon className="w-7 h-7 text-terakota-400" aria-hidden="true" />
                </div>
                <h3 className="text-white font-display font-bold text-xl mb-3">{title}</h3>
                <p className="text-khatulistiwa-300/60 text-sm leading-relaxed">{desc}</p>

                {/* Bottom accent on hover */}
                <div className="absolute -bottom-7 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-terakota-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ — white accordion on cream ────────────────────────────────────────────

const FAQS = [
  { q: "Apakah layanan Lantara berbayar?", a: "Tidak. Seluruh layanan perizinan melalui Lantara 100% gratis untuk masyarakat. Tidak ada biaya administrasi atau biaya tersembunyi apa pun." },
  { q: "Berapa lama proses perizinan?", a: "Setiap jenis izin memiliki SLA (batas waktu) tersendiri, umumnya antara 3 hingga 8 hari kerja. Anda dapat memantau progres secara real-time di portal pemohon." },
  { q: "Dokumen apa saja yang perlu disiapkan?", a: "Persyaratan dokumen berbeda untuk setiap jenis izin dan ditampilkan lengkap di halaman katalog masing-masing izin sebelum Anda mengajukan permohonan." },
  { q: "Bagaimana cara memvalidasi izin yang sudah terbit?", a: "Setiap izin digital dilengkapi QR code. Pindai QR atau buka halaman Validasi Dokumen untuk memverifikasi keaslian izin secara real-time." },
  { q: "Apakah saya bisa mengajukan revisi tanpa mengunggah ulang semua dokumen?", a: "Ya. Bila verifikator meminta revisi, Anda hanya perlu memperbaiki bagian atau dokumen yang diminta. Dokumen lain yang sudah valid tetap tersimpan." },
];

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white border border-pertiwi-muted rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-khatulistiwa-900 font-display font-semibold text-base">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-khatulistiwa-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pb-5 border-t border-pertiwi-muted">
              <p className="text-khatulistiwa-600/70 text-sm leading-relaxed pt-4">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-pertiwi-warm py-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-terakota-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">Pertanyaan Umum</p>
          <h2 className="text-khatulistiwa-900 font-display font-black text-4xl md:text-5xl">FAQ</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <FAQItem
              key={i}
              q={f.q}
              a={f.a}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA — brand blue, definitive close ────────────────────────────────────────

function CTA() {
  return (
    <section
      className="relative overflow-hidden py-24 px-8"
      style={{ background: "linear-gradient(135deg, #0D3060 0%, #185088 50%, #1E6BA8 100%)" }}
    >
      <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-terakota-500/[0.08] blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-terakota-300/80 text-xs font-bold tracking-[0.2em] uppercase mb-4">MULAI SEKARANG</p>
          <h2 className="text-white font-display font-black text-5xl mb-4">
            Siap Mengajukan<br />Izin?
          </h2>
          <p className="text-blue-200/60 text-lg mb-8 leading-relaxed">
            Bergabung dengan ribuan pemohon yang telah mendapatkan izin mereka melalui Lantara.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 bg-terakota-500 hover:bg-terakota-400 text-khatulistiwa-900 font-display font-bold px-10 py-4 rounded-2xl transition-all shadow-xl shadow-terakota-500/30 hover:-translate-y-0.5"
            >
              Daftar Gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/layanan"
              className="inline-flex items-center bg-white/10 hover:bg-white/20 border border-white/20 text-white font-display font-semibold px-10 py-4 rounded-2xl transition-all"
            >
              Lihat Layanan
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-khatulistiwa-950">
      <BatikBorder flip opacity={0.5} />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="space-y-3 max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-lg bg-khatulistiwa-600 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" aria-hidden="true" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-terakota-500" aria-hidden="true" />
              </div>
              <span className="font-display font-extrabold text-white text-lg">Lantara</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              Platform perizinan resmi Otorita Ibu Kota Nusantara (IKN). Layanan online, transparan, dan terpercaya.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-white text-sm font-bold uppercase tracking-wider pb-2 border-b border-terakota-500/50">IKN</p>
            <nav className="grid gap-2.5 text-sm">
              <Link to="/layanan" className="text-white/50 hover:text-white transition-colors">Katalog Layanan</Link>
              <Link to="/rdtr" className="text-white/50 hover:text-white transition-colors">Peta RDTR</Link>
              <Link to="/auth/register" className="text-white/50 hover:text-white transition-colors">Daftar</Link>
              <Link to="/auth/login" className="text-white/50 hover:text-white transition-colors">Masuk</Link>
            </nav>
          </div>

          <div className="space-y-3">
            <p className="text-white text-sm font-bold uppercase tracking-wider pb-2 border-b border-terakota-500/50">Alamat</p>
            <p className="text-white/50 text-sm leading-relaxed max-w-[220px]">
              Otorita Ibu Kota Nusantara<br />Kalimantan Timur, Indonesia
            </p>
            <a href="https://wa.me/6280000000000" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
              <MessageCircle className="h-4 w-4 text-terakota-400" aria-hidden="true" />
              WhatsApp Resmi
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-white/40 text-xs">© 2026 Otorita Ibu Kota Nusantara. Semua hak dilindungi.</span>
          <span className="text-white/30 text-xs">Dibangun oleh Direktorat Data dan Kecerdasan Buatan</span>
        </div>
      </div>

      <BatikBorder opacity={0.5} />
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { data: sektors } = useQuery<Sektor[]>({
    queryKey: ["sektors"],
    queryFn: () => api.get("/sektors/").then((r) => r.data.results ?? r.data),
  });

  return (
    <div>
      <PublicNav />
      <Hero />
      <main id="main-content">
        {/* Hero (dark #04182A) → StatsStrip (gold) — BatikBorder handles this */}
        <StatsStrip />
        {/* gold → cream */}
        <WaveTransition from="#DBAF6C" to="#F5F0E8" />
        <SektorCards sektors={sektors ?? []} />
        {/* cream → dark khatulistiwa-900 */}
        <WaveTransition from="#F5F0E8" to="#0A2540" />
        <SearchSection />
        {/* dark → cream */}
        <WaveTransition from="#0A2540" to="#F5F0E8" />
        <HowItWorks />
        {/* cream → dark khatulistiwa-950 */}
        <WaveTransition from="#F5F0E8" to="#04182A" />
        <Features />
        {/* dark → cream */}
        <WaveTransition from="#04182A" to="#F5F0E8" />
        <FAQ />
        {/* cream → brand blue */}
        <WaveTransition from="#F5F0E8" to="#0D3060" />
        <CTA />
        {/* blue → footer dark — Footer's BatikBorder provides the visual separator */}
        <WaveTransition from="#1E6BA8" to="#04182A" />
      </main>
      <Footer />
    </div>
  );
}
