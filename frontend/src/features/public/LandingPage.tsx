import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Clock, Shield, Smartphone, CheckCircle2,
  MapPin, ChevronDown,
  Search, Menu, X, MessageCircle, Building2,
} from "lucide-react";
import api from "@/lib/api";
import type { Sektor } from "@/types";

// ── Batik chain/loop ornament border (IKN motif) ───────────────────────────────

function BatikBorder({ flip = false, opacity = 0.35 }: { flip?: boolean; opacity?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      style={{ width: "100%", height: "64px", transform: flip ? "scaleY(-1)" : "none", opacity }}
      aria-hidden="true"
    >
      <svg width="100%" height="64" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`batik-${id}`} x="0" y="0" width="120" height="64" patternUnits="userSpaceOnUse">
            <rect x="10" y="8" width="100" height="48" rx="24" ry="24" fill="none" stroke="#D4A017" strokeWidth="1.5" />
            <rect x="22" y="16" width="76" height="32" rx="16" ry="16" fill="none" stroke="#D4A017" strokeWidth="1" />
            <rect x="52" y="26" width="16" height="12" rx="6" ry="6" fill="none" stroke="#D4A017" strokeWidth="1" />
            <circle cx="10" cy="32" r="3" fill="#D4A017" fillOpacity="0.6" />
            <circle cx="110" cy="32" r="3" fill="#D4A017" fillOpacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="64" fill={`url(#batik-${id})`} />
      </svg>
    </div>
  );
}

// ── Public navbar (transparent → navy on scroll) ───────────────────────────────

const NAV_LINKS = [
  { to: "/layanan", label: "Katalog Izin" },
  { to: "/rdtr", label: "Peta RDTR" },
  { to: "/validate", label: "Validasi Dokumen" },
];

function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy-900/95 backdrop-blur-md border-b border-white/10 shadow-lg"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Lantara beranda">
          <div className="relative h-9 w-9 rounded-xl bg-navy-500 flex items-center justify-center shadow-[0_0_24px_rgba(37,99,235,0.5)]">
            <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold-400 ring-2 ring-navy-900" aria-hidden="true" />
          </div>
          <span className="font-display font-extrabold text-white text-lg tracking-tight">Lantara</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white transition-colors
                         after:absolute after:left-3.5 after:right-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full
                         after:bg-gold-400 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/auth/login"
            className="px-4 py-2 text-sm font-semibold text-white/85 rounded-xl border border-white/20 hover:bg-white/10 hover:border-white/35 transition-all"
          >
            Masuk
          </Link>
          <Link
            to="/auth/register"
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-blue-600 hover:bg-blue-500 shadow-[0_0_24px_rgba(37,99,235,0.4)] transition-all"
          >
            Daftar
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-white"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-navy-900/98 backdrop-blur-md border-b border-white/10"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-3 mt-2 border-t border-white/10">
                <Link to="/auth/login" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl border border-white/20">
                  Masuk
                </Link>
                <Link to="/auth/register" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-blue-600">
                  Daftar
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Hero — full-bleed, no card, city-lights glow + batik ───────────────────────

function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0B1B3E]"
      aria-label="Hero Lantara"
    >
      {/* City-lights radial glow rising from bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 120%, #1A3480 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      {/* Faint dot grid for depth */}
      <div className="absolute inset-0 dot-grid opacity-[0.04] text-white pointer-events-none" aria-hidden="true" />

      {/* Centered content — sits directly on the dark background */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-4 text-center flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-gold-400/40 text-gold-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" aria-hidden="true" />
          Portal Resmi Otorita Ibu Kota Nusantara
        </div>

        <h1
          className="font-display font-black text-white text-7xl md:text-9xl tracking-tight leading-none"
          style={{ textShadow: "0 0 80px rgba(59,130,246,0.4)" }}
        >
          Lantara
        </h1>

        <p className="text-xl md:text-2xl font-display font-medium text-blue-200/80 mt-6 max-w-[600px]">
          Layanan Perizinan Digital Ibu Kota Nusantara
        </p>
        <p className="text-base text-white/50 mt-4 max-w-[480px] leading-relaxed">
          Satu portal untuk mengajukan, memantau, dan menerima izin Anda —
          cepat, transparan, dan sepenuhnya digital.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link
            to="/auth/register"
            className="group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 py-3.5 font-semibold transition-all shadow-[0_8px_30px_rgba(37,99,235,0.35)]"
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
      </motion.div>

      {/* Batik ornament strip at the very bottom edge */}
      <div className="absolute bottom-0 inset-x-0">
        <BatikBorder opacity={0.35} />
      </div>
    </section>
  );
}

// ── Gold stats strip ───────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: "31+", label: "Sektor Layanan" },
    { value: "Rp 0", label: "Biaya Perizinan" },
    { value: "100%", label: "Proses Digital" },
    { value: "2045", label: "Visi IKN" },
  ];

  return (
    <div className="w-full bg-[#D4A017] py-8 px-8">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {stats.map(({ value, label }, i) => (
          <div key={label} className="flex items-center gap-4 flex-1 justify-center">
            <div className="text-center">
              <div className="font-display font-black text-[#0B1B3E] text-3xl sm:text-4xl">{value}</div>
              <div className="text-[#0B1B3E]/70 text-xs sm:text-sm font-semibold mt-1">{label}</div>
            </div>
            {i < stats.length - 1 && (
              <div className="hidden sm:block w-px h-12 bg-[#0B1B3E]/20 shrink-0" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sektor cards — dark glassmorphism ──────────────────────────────────────────

function SektorCards({ sektors }: { sektors: Sektor[] }) {
  return (
    <section className="bg-[#0B1B3E] py-24">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[#D4A017] text-xs font-bold tracking-[0.2em] uppercase mb-3">Layanan Kami</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Pilih Sektor Anda</h2>
          <p className="mt-4 text-blue-200/60 max-w-md mx-auto text-base">
            31+ jenis izin tersedia secara digital, dikategori per sektor layanan.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sektors.map((sektor, i) => (
            <motion.div
              key={sektor.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/layanan#${sektor.key}`}
                className="group relative overflow-hidden block rounded-2xl p-7
                           bg-white/[0.04] border border-white/[0.08]
                           hover:bg-white/[0.08] hover:border-white/[0.15]
                           hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
                           transition-all duration-300 ease-out
                           before:content-[''] before:absolute before:top-0 before:left-6 before:right-6 before:h-px
                           before:bg-gradient-to-r before:from-transparent before:via-yellow-400/40 before:to-transparent"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-blue-500/20 p-3 w-11 h-11 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
                    {sektor.permit_count} izin
                  </span>
                </div>

                <p className="text-white font-display font-bold text-xl mt-5">{sektor.name}</p>
                {sektor.pengampu && (
                  <p className="text-blue-300/60 text-sm mt-1">{sektor.pengampu}</p>
                )}

                <span className="text-blue-400 hover:text-blue-300 text-sm font-semibold mt-5 inline-flex items-center gap-1.5">
                  Lihat Izin
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/layanan"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 font-semibold transition-colors shadow-[0_8px_30px_rgba(37,99,235,0.3)]"
          >
            Lihat Semua Layanan
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── "Cari Layanan" search (dark) ───────────────────────────────────────────────

function SearchSection() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/layanan?q=${encodeURIComponent(q.trim())}` : "/layanan");
  }

  return (
    <section className="bg-[#060D2E] py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-white font-display font-bold text-2xl md:text-3xl mb-2">Cari Layanan</h2>
        <p className="text-blue-200/50 text-sm mb-7">Temukan jenis izin berdasarkan sektor atau kode KBLI.</p>
        <form
          onSubmit={submit}
          className="flex items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.10] p-2 backdrop-blur-sm"
        >
          <Search className="h-5 w-5 text-blue-200/40 ml-3 shrink-0" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari jenis izin, sektor, atau KBLI…"
            className="flex-1 bg-transparent border-0 py-2.5 text-sm text-white placeholder:text-blue-200/35 focus:outline-none focus:ring-0"
            aria-label="Cari layanan perizinan"
          />
          <button
            type="submit"
            className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cari</span>
          </button>
        </form>
      </div>
    </section>
  );
}

// ── How it works (dark) ────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { num: "01", title: "Daftar & Verifikasi", body: "Buat akun dengan NIK dan email. Verifikasi dengan OTP satu langkah." },
    { num: "02", title: "Pilih Jenis Izin",    body: "Cari izin dari katalog 31+ layanan, baca persyaratan lengkapnya." },
    { num: "03", title: "Isi & Unggah",        body: "Lengkapi formulir dan dokumen digital secara online, kapan saja." },
    { num: "04", title: "Pantau & Terima",     body: "Lacak proses real-time, terima notifikasi, unduh izin digital Anda." },
  ];

  return (
    <section className="bg-[#0B1B3E] py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[#D4A017] text-xs font-bold tracking-[0.2em] uppercase mb-3">Cara Kerja</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Empat Langkah Mudah</h2>
        </motion.div>

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" aria-hidden="true" />
          {steps.map(({ num, title, body }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="h-16 w-16 rounded-2xl bg-white/[0.05] border border-white/[0.10] backdrop-blur-sm flex items-center justify-center mb-5">
                <span className="font-display text-xl font-extrabold text-gold-400">{num}</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
              <p className="text-blue-200/55 text-sm leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features (dark glass) ──────────────────────────────────────────────────────

function Features() {
  const features = [
    { icon: Clock,        title: "SLA Transparan",        body: "Setiap tahap punya batas waktu. Pantau kapan izin Anda akan selesai secara real-time." },
    { icon: Shield,       title: "Dokumen Terverifikasi", body: "Setiap izin digital dilengkapi QR code untuk validasi keaslian kapan saja, di mana saja." },
    { icon: Smartphone,   title: "Notifikasi Aktif",      body: "Pemberitahuan via email dan WhatsApp di setiap perubahan status permohonan Anda." },
    { icon: CheckCircle2, title: "Tanpa Biaya Layanan",   body: "Platform 100% gratis untuk masyarakat. Tidak ada biaya administrasi tersembunyi." },
  ];

  return (
    <section className="bg-[#060D2E] py-24">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[#D4A017] text-xs font-bold tracking-[0.2em] uppercase mb-3">Keunggulan</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Mengapa Lantara?</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="relative overflow-hidden rounded-2xl p-7 flex gap-5
                         bg-white/[0.04] border border-white/[0.08]
                         hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300
                         before:content-[''] before:absolute before:top-0 before:left-6 before:right-6 before:h-px
                         before:bg-gradient-to-r before:from-transparent before:via-yellow-400/40 before:to-transparent"
            >
              <div className="shrink-0 rounded-xl bg-blue-500/20 w-12 h-12 flex items-center justify-center">
                <Icon className="h-6 w-6 text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">{title}</h3>
                <p className="text-sm text-blue-200/55 mt-1.5 leading-relaxed">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ accordion (navy-900) ───────────────────────────────────────────────────

const FAQS = [
  { q: "Apakah layanan Lantara berbayar?", a: "Tidak. Seluruh layanan perizinan melalui Lantara 100% gratis untuk masyarakat. Tidak ada biaya administrasi atau biaya tersembunyi apa pun." },
  { q: "Berapa lama proses perizinan?", a: "Setiap jenis izin memiliki SLA (batas waktu) tersendiri, umumnya antara 3 hingga 8 hari kerja. Anda dapat memantau progres secara real-time di portal pemohon." },
  { q: "Dokumen apa saja yang perlu disiapkan?", a: "Persyaratan dokumen berbeda untuk setiap jenis izin dan ditampilkan lengkap di halaman katalog masing-masing izin sebelum Anda mengajukan permohonan." },
  { q: "Bagaimana cara memvalidasi izin yang sudah terbit?", a: "Setiap izin digital dilengkapi QR code. Pindai QR atau buka halaman Validasi Dokumen untuk memverifikasi keaslian izin secara real-time." },
  { q: "Apakah saya bisa mengajukan revisi tanpa mengunggah ulang semua dokumen?", a: "Ya. Bila verifikator meminta revisi, Anda hanya perlu memperbaiki bagian atau dokumen yang diminta. Dokumen lain yang sudah valid tetap tersimpan." },
];

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-200 border ${
        isOpen
          ? "bg-white/[0.07] border-white/[0.15] border-t-2 border-t-[#D4A017]"
          : "bg-white/[0.03] border-white/[0.07]"
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-white font-display font-semibold">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gold-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
            <p className="px-5 pb-5 text-sm text-blue-200/70 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-[#060D2E] py-24">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-[#D4A017] text-xs font-bold tracking-[0.2em] uppercase mb-3">Pertanyaan Umum</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">FAQ</h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <FAQItem key={i} q={f.q} a={f.a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA (navy + gold) ──────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden bg-[#0B1B3E] py-24">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, #1A3480 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 dot-grid opacity-[0.05] text-white" aria-hidden="true" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-gold-300 text-xs font-bold uppercase tracking-widest mb-4">Mulai Sekarang</p>
          <h2 className="font-display font-black text-white text-4xl md:text-5xl mb-5">Siap Mengajukan Izin?</h2>
          <p className="text-blue-200/70 text-lg mb-10 leading-relaxed">
            Bergabung dengan ribuan pemohon yang telah mendapatkan izin mereka melalui Lantara.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4A017] hover:bg-gold-400 text-[#0B1B3E] px-8 py-4 font-bold text-base transition-colors shadow-[0_8px_30px_rgba(212,160,23,0.3)]"
            >
              Daftar Gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/layanan"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm px-8 py-4 font-bold text-base text-white hover:bg-white/20 transition-colors"
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
    <footer className="bg-[#0B1B3E]">
      <BatikBorder flip opacity={0.5} />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="space-y-3 max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-lg bg-navy-500 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" aria-hidden="true" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              </div>
              <span className="font-display font-extrabold text-white text-lg">Lantara</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              Platform perizinan resmi Otorita Ibu Kota Nusantara (IKN). Layanan online, transparan, dan terpercaya.
            </p>
          </div>

          {/* IKN links */}
          <div className="space-y-3">
            <p className="text-white text-sm font-bold uppercase tracking-wider pb-2 border-b border-gold-500/50">IKN</p>
            <nav className="grid gap-2.5 text-sm">
              <Link to="/layanan" className="text-white/50 hover:text-white transition-colors">Katalog Layanan</Link>
              <Link to="/rdtr" className="text-white/50 hover:text-white transition-colors">Peta RDTR</Link>
              <Link to="/auth/register" className="text-white/50 hover:text-white transition-colors">Daftar</Link>
              <Link to="/auth/login" className="text-white/50 hover:text-white transition-colors">Masuk</Link>
            </nav>
          </div>

          {/* Address / contact */}
          <div className="space-y-3">
            <p className="text-white text-sm font-bold uppercase tracking-wider pb-2 border-b border-gold-500/50">Alamat</p>
            <p className="text-white/50 text-sm leading-relaxed max-w-[220px]">
              Otorita Ibu Kota Nusantara<br />Kalimantan Timur, Indonesia
            </p>
            <a
              href="https://wa.me/6280000000000"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-gold-400" aria-hidden="true" />
              WhatsApp Resmi
            </a>
          </div>
        </div>

        {/* Bottom bar */}
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
    <div className="bg-[#0B1B3E]">
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
