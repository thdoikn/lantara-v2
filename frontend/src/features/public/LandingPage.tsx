import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Clock, Shield, Smartphone, CheckCircle2,
  ChevronDown, Search, MessageCircle, Building2,
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


// ── Hero — full-bleed, layered glow, live status panel + batik ─────────────────

const HERO_BG = `
  radial-gradient(ellipse 60% 50% at 20% 50%, rgba(24,80,136,0.25) 0%, transparent 60%),
  radial-gradient(ellipse 50% 40% at 80% 30%, rgba(24,80,136,0.15) 0%, transparent 55%),
  radial-gradient(ellipse 80% 60% at 50% 110%, rgba(24,80,136,0.3) 0%, transparent 65%),
  #04182A`;

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: HERO_BG }} aria-label="Hero Lantara">
      <div className="absolute inset-0 dot-grid opacity-[0.04] text-white pointer-events-none" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-4 text-center flex flex-col items-center"
      >
        <h1 className="font-display font-black text-white text-7xl md:text-9xl tracking-tight leading-none" style={{ textShadow: "0 0 80px rgba(46,133,200,0.35)" }}>
          Lantara
        </h1>

        <p className="text-xl md:text-2xl font-display font-medium text-khatulistiwa-200/80 mt-6 max-w-[600px]">
          Layanan Perizinan Digital Ibu Kota Nusantara
        </p>
        <p className="text-base text-white/50 mt-4 max-w-[480px] leading-relaxed">
          Satu portal untuk mengajukan, memantau, dan menerima izin Anda — cepat, transparan, dan sepenuhnya digital.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link to="/auth/register" className="group inline-flex items-center justify-center gap-2 bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white rounded-xl px-8 py-3.5 font-semibold transition-all shadow-[0_8px_30px_rgba(24,80,136,0.4)]">
            Ajukan Izin Sekarang
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <Link to="/layanan" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl px-8 py-3.5 font-semibold transition-all">
            Lihat Katalog
          </Link>
        </div>

        {/* Live status panel */}
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

// ── Sektor cards — per-sektor accent + glow ────────────────────────────────────

function SektorCards({ sektors }: { sektors: Sektor[] }) {
  return (
    <section className="bg-khatulistiwa-950 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-terakota-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">Layanan Kami</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Pilih Sektor Anda</h2>
          <p className="mt-4 text-khatulistiwa-300/60 max-w-md mx-auto text-base">
            31+ jenis izin tersedia secara digital, dikategori per sektor layanan.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {sektors.map((sektor, i) => {
            const v = getSektorVisual(sektor.key, sektor.name);
            const Icon = v.Icon;
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
                  className="group relative overflow-hidden flex flex-col h-full rounded-2xl p-7
                             bg-khatulistiwa-900/60 border border-white/[0.08]
                             hover:bg-khatulistiwa-800/60 hover:border-white/[0.16] hover:-translate-y-2
                             hover:shadow-[0_20px_60px_rgba(24,80,136,0.35)]
                             transition-all duration-300 ease-out"
                >
                  <div className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent to-transparent ${v.via}`} />

                  <div className="flex items-start justify-between">
                    <div className={`${v.iconWrap} rounded-xl p-3 w-12 h-12 flex items-center justify-center ring-1 ring-white/10`}>
                      <Icon className={`w-5 h-5 ${v.iconText}`} aria-hidden="true" />
                    </div>
                    <span className={`${v.badge} text-xs font-bold px-3 py-1.5 rounded-full`}>{sektor.permit_count} izin</span>
                  </div>

                  <h3 className="text-white font-display font-bold text-xl mt-5">{sektor.name}</h3>
                  <p className="text-khatulistiwa-300/60 text-sm mt-1.5 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {sektor.pengampu || "Layanan perizinan sektor"}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/[0.06]">
                    <span className="text-white/40 text-xs">Layanan aktif</span>
                    <span className={`${v.link} text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all`}>
                      Lihat Izin <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/layanan" className="inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white px-7 py-3.5 font-semibold transition-colors shadow-[0_8px_30px_rgba(24,80,136,0.3)]">
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
    <section className="bg-khatulistiwa-900 py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-white font-display font-bold text-2xl md:text-3xl mb-2">Cari Layanan</h2>
        <p className="text-khatulistiwa-300/50 text-sm mb-7">Temukan jenis izin berdasarkan sektor atau kode KBLI.</p>
        <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.10] p-2 backdrop-blur-sm">
          <Search className="h-5 w-5 text-khatulistiwa-300/40 ml-3 shrink-0" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari jenis izin, sektor, atau KBLI…"
            className="flex-1 bg-transparent border-0 py-2.5 text-sm text-white placeholder:text-khatulistiwa-300/35 focus:outline-none focus:ring-0"
            aria-label="Cari layanan perizinan"
          />
          <button type="submit" className="shrink-0 inline-flex items-center gap-2 bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cari</span>
          </button>
        </form>
      </div>
    </section>
  );
}

// ── Cara Kerja — timeline ──────────────────────────────────────────────────────

const STEPS = [
  { title: "Daftar & Verifikasi", desc: "Buat akun dengan NIK dan email. Verifikasi dengan OTP satu langkah." },
  { title: "Pilih Jenis Izin", desc: "Cari izin dari katalog 31+ layanan, baca persyaratan lengkapnya." },
  { title: "Isi & Unggah", desc: "Lengkapi formulir dan dokumen digital secara online, kapan saja." },
  { title: "Pantau & Terima", desc: "Lacak proses real-time, terima notifikasi, unduh izin digital Anda." },
];

function HowItWorks() {
  return (
    <section className="py-24 px-8" style={{ background: "linear-gradient(180deg, #0A2540 0%, #04182A 100%)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-terakota-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">Cara Kerja</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Empat Langkah Mudah</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-0 relative">
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-terakota-500/40 to-transparent" aria-hidden="true" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center px-6 relative"
            >
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-khatulistiwa-800 border border-khatulistiwa-600/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(24,80,136,0.3)]">
                <span className="text-terakota-500 font-display font-black text-2xl">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="text-white font-display font-bold text-lg">{step.title}</h3>
              <p className="text-khatulistiwa-300/60 text-sm mt-2 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Mengapa Lantara — feature rows ─────────────────────────────────────────────

const FEATURES = [
  { Icon: Clock, title: "SLA Transparan", desc: "Setiap tahap punya batas waktu. Pantau kapan izin Anda akan selesai secara real-time." },
  { Icon: Shield, title: "Dokumen Terverifikasi", desc: "Setiap izin digital dilengkapi QR code untuk validasi keaslian kapan saja, di mana saja." },
  { Icon: Smartphone, title: "Notifikasi Aktif", desc: "Pemberitahuan via email dan WhatsApp di setiap perubahan status permohonan Anda." },
  { Icon: CheckCircle2, title: "Tanpa Biaya Layanan", desc: "Platform 100% gratis untuk masyarakat. Tidak ada biaya administrasi tersembunyi." },
];

function Features() {
  return (
    <section className="py-24 bg-khatulistiwa-950">
      <div className="max-w-5xl mx-auto px-8">
        <div className="text-center mb-16">
          <p className="text-terakota-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">Keunggulan</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Mengapa Lantara?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group flex gap-5 items-start p-6 rounded-2xl bg-khatulistiwa-900/40 border border-khatulistiwa-700/20 hover:bg-khatulistiwa-800/40 hover:border-khatulistiwa-600/40 transition-all duration-300"
            >
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-terakota-500/10 border border-terakota-500/20 flex items-center justify-center group-hover:bg-terakota-500/20 transition-colors">
                <Icon className="w-6 h-6 text-terakota-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-white font-display font-bold text-lg">{title}</h3>
                <p className="text-khatulistiwa-300/60 text-sm mt-1.5 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ accordion ──────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Apakah layanan Lantara berbayar?", a: "Tidak. Seluruh layanan perizinan melalui Lantara 100% gratis untuk masyarakat. Tidak ada biaya administrasi atau biaya tersembunyi apa pun." },
  { q: "Berapa lama proses perizinan?", a: "Setiap jenis izin memiliki SLA (batas waktu) tersendiri, umumnya antara 3 hingga 8 hari kerja. Anda dapat memantau progres secara real-time di portal pemohon." },
  { q: "Dokumen apa saja yang perlu disiapkan?", a: "Persyaratan dokumen berbeda untuk setiap jenis izin dan ditampilkan lengkap di halaman katalog masing-masing izin sebelum Anda mengajukan permohonan." },
  { q: "Bagaimana cara memvalidasi izin yang sudah terbit?", a: "Setiap izin digital dilengkapi QR code. Pindai QR atau buka halaman Validasi Dokumen untuk memverifikasi keaslian izin secara real-time." },
  { q: "Apakah saya bisa mengajukan revisi tanpa mengunggah ulang semua dokumen?", a: "Ya. Bila verifikator meminta revisi, Anda hanya perlu memperbaiki bagian atau dokumen yang diminta. Dokumen lain yang sudah valid tetap tersimpan." },
];

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-200 border ${
      isOpen ? "bg-white/[0.07] border-white/[0.15] border-t-2 border-t-terakota-500" : "bg-white/[0.03] border-white/[0.07]"
    }`}>
      <button onClick={onToggle} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-white font-display font-semibold">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-terakota-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <p className="px-5 pb-5 text-sm text-khatulistiwa-200/70 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-khatulistiwa-900 py-24">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-terakota-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">Pertanyaan Umum</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">FAQ</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <FAQItem key={i} q={f.q} a={f.a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ────────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden bg-khatulistiwa-950 py-24 border-t border-khatulistiwa-700/40">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(24,80,136,0.3) 0%, transparent 70%)" }} aria-hidden="true" />
      <div className="absolute inset-0 dot-grid opacity-[0.05] text-white" aria-hidden="true" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-terakota-500 text-xs font-bold uppercase tracking-widest mb-4">Mulai Sekarang</p>
          <h2 className="font-display font-black text-white text-4xl md:text-5xl mb-5">Siap Mengajukan Izin?</h2>
          <p className="text-khatulistiwa-200/70 text-lg mb-10 leading-relaxed">
            Bergabung dengan ribuan pemohon yang telah mendapatkan izin mereka melalui Lantara.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white px-8 py-4 font-bold text-base transition-colors shadow-[0_8px_30px_rgba(24,80,136,0.4)]">
              Daftar Gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/layanan" className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-8 py-4 font-bold text-base text-white transition-colors">
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
    <div className="bg-khatulistiwa-950">
      <PublicNav />
      <Hero />
      <main id="main-content">
        <StatsStrip />
        <SektorCards sektors={sektors ?? []} />
        <SearchSection />
        <HowItWorks />
        <Features />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
