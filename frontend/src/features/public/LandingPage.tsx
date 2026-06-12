import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Clock, Shield, Smartphone, CheckCircle2,
  Zap, MapPin, FileCheck, ChevronRight, ChevronDown,
  Search, Menu, X, MessageCircle, Building2,
} from "lucide-react";
import api from "@/lib/api";
import type { Sektor } from "@/types";

// ── Public navbar (transparent → royal on scroll) ──────────────────────────────

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
          ? "bg-royal-900/95 backdrop-blur-md border-b border-white/10 shadow-lg"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="Lantara beranda">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-royal flex items-center justify-center shadow-glow-royal">
            <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold-400 ring-2 ring-royal-900" aria-hidden="true" />
          </div>
          <span className="font-display font-extrabold text-white text-lg tracking-tight">Lantara</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white transition-colors
                         after:absolute after:left-3.5 after:right-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full
                         after:bg-royal-400 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/auth/login"
            className="px-4 py-2 text-sm font-semibold text-white/85 rounded-xl border border-white/20
                       hover:bg-white/10 hover:border-white/35 transition-all"
          >
            Masuk
          </Link>
          <Link
            to="/auth/register"
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-royal-500 hover:bg-royal-400
                       shadow-glow-royal transition-all"
          >
            Daftar
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-white"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-royal-900/98 backdrop-blur-md border-b border-white/10"
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
                  className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-royal-500">
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

// ── Drifting glow orbs (pure CSS, GPU-light) ───────────────────────────────────

function GlowOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden" aria-hidden="true">
      <div className="absolute top-[-10%] left-[-5%] h-[460px] w-[460px] rounded-full bg-royal-700/40 blur-[130px] animate-drift-1" />
      <div className="absolute bottom-[-15%] right-[-8%] h-[400px] w-[400px] rounded-full bg-royal-500/25 blur-[120px] animate-drift-2" />
      <div className="absolute top-[30%] right-[20%] h-[300px] w-[300px] rounded-full bg-gold-500/10 blur-[110px] animate-drift-3" />
      <div className="absolute bottom-[20%] left-[15%] h-[280px] w-[280px] rounded-full bg-royal-400/20 blur-[100px] animate-drift-2" />
    </div>
  );
}

// ── Hero with floating glass card ──────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const cardY = useTransform(scrollYProgress, [0, 0.6], ["0%", "18%"]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.2]);

  return (
    <section
      ref={ref}
      className="relative h-screen min-h-[700px] overflow-hidden flex items-center justify-center bg-gradient-hero"
      aria-label="Hero Lantara"
    >
      <GlowOrbs />

      {/* Dot grid + line accents */}
      <div className="absolute inset-0 dot-grid opacity-[0.05] text-white pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" aria-hidden="true" />

      {/* Floating glass card */}
      <motion.div
        style={{ y: cardY, opacity: cardOpacity }}
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-4 w-full max-w-2xl"
      >
        <div className="card-glass grain rounded-3xl px-7 py-10 sm:px-12 sm:py-14 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs text-white/85 font-medium mb-7 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" aria-hidden="true" />
            Portal Resmi Otorita Ibu Kota Nusantara
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-5">
            Lantara
          </h1>
          <p className="font-display text-lg sm:text-2xl font-semibold text-gradient-light mb-3">
            Layanan Perizinan Digital Ibu Kota Nusantara
          </p>
          <p className="text-white/55 text-sm sm:text-base max-w-md mx-auto mb-9 leading-relaxed">
            Satu portal untuk mengajukan, memantau, dan menerima izin Anda —
            cepat, transparan, dan sepenuhnya digital.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/auth/register"
              className="group inline-flex items-center justify-center gap-2 rounded-xl
                         bg-royal-500 hover:bg-royal-400 px-7 py-3.5 text-base font-bold text-white
                         shadow-glow-royal hover:shadow-glow-blue transition-all duration-200"
            >
              Ajukan Izin Sekarang
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
            <Link
              to="/layanan"
              className="inline-flex items-center justify-center gap-2 rounded-xl
                         border border-white/25 bg-white/10 backdrop-blur-sm px-7 py-3.5 text-base font-bold text-white
                         hover:bg-white/18 hover:border-white/40 transition-all duration-200"
            >
              Lihat Katalog
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
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
    <section className="relative z-20 -mt-10 px-4">
      <form
        onSubmit={submit}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-floating ring-1 ring-royal-900/[0.06]
                   p-2 flex items-center gap-2"
      >
        <Search className="h-5 w-5 text-ink-faint ml-3 shrink-0" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari jenis izin, sektor, atau KBLI…"
          className="flex-1 bg-transparent border-0 py-2.5 text-sm text-foreground placeholder:text-ink-faint focus:outline-none focus:ring-0"
          aria-label="Cari layanan perizinan"
        />
        <button type="submit" className="btn-primary shrink-0 py-2.5">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Cari</span>
        </button>
      </form>
    </section>
  );
}

// ── Stats strip ────────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: "31+", label: "Sektor Layanan", icon: FileCheck },
    { value: "Rp 0", label: "Biaya Perizinan", icon: CheckCircle2 },
    { value: "100%", label: "Digital", icon: Zap },
    { value: "2045", label: "Visi Nusantara", icon: Clock },
  ];

  return (
    <div className="bg-royal-800 py-14 mt-20">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
        {stats.map(({ value, label, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="text-center"
          >
            <Icon className="h-5 w-5 text-gold-400 mx-auto mb-3" aria-hidden="true" />
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-white">{value}</div>
            <div className="text-xs sm:text-sm text-royal-300 font-medium mt-1.5">{label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Sektor cards ──────────────────────────────────────────────────────────────

const SEKTOR_STYLES = [
  { border: "border-royal-600", iconBg: "bg-royal-100", icon: "text-royal-600", badge: "text-royal-700", hover: "group-hover:text-royal-600", link: "text-royal-600" },
  { border: "border-royal-500", iconBg: "bg-royal-50", icon: "text-royal-500", badge: "text-royal-600", hover: "group-hover:text-royal-500", link: "text-royal-500" },
  { border: "border-gold-500", iconBg: "bg-gold-300/25", icon: "text-gold-500", badge: "text-gold-500", hover: "group-hover:text-gold-500", link: "text-gold-500" },
  { border: "border-royal-700", iconBg: "bg-royal-100", icon: "text-royal-700", badge: "text-royal-700", hover: "group-hover:text-royal-700", link: "text-royal-700" },
  { border: "border-royal-400", iconBg: "bg-royal-50", icon: "text-royal-400", badge: "text-royal-500", hover: "group-hover:text-royal-400", link: "text-royal-400" },
  { border: "border-gold-400", iconBg: "bg-gold-300/20", icon: "text-gold-500", badge: "text-gold-500", hover: "group-hover:text-gold-500", link: "text-gold-500" },
];

function SektorCards({ sektors }: { sektors: Sektor[] }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <p className="section-label mb-3">Layanan Kami</p>
        <h2 className="font-display text-4xl font-extrabold text-foreground">Pilih Sektor Anda</h2>
        <p className="mt-4 text-ink-muted max-w-md mx-auto text-base">
          31+ jenis izin tersedia secara digital, dikategori per sektor layanan.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sektors.map((sektor, i) => {
          const s = SEKTOR_STYLES[i % SEKTOR_STYLES.length];
          return (
            <motion.div
              key={sektor.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/layanan#${sektor.key}`}
                className={`group block rounded-2xl bg-white p-6 border-l-4 ${s.border}
                            ring-1 ring-royal-900/[0.06] shadow-sm
                            hover:shadow-card-hover hover:ring-royal-500/30 transition-all duration-200 hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                    <MapPin className={`h-5 w-5 ${s.icon}`} aria-hidden="true" />
                  </div>
                  <span className={`text-xs font-semibold ${s.badge} bg-royal-50 px-2.5 py-1 rounded-full`}>
                    {sektor.permit_count} izin
                  </span>
                </div>

                <p className={`font-display font-bold text-lg text-foreground ${s.hover} transition-colors`}>
                  {sektor.name}
                </p>
                {sektor.pengampu && (
                  <p className="text-xs text-ink-muted mt-1">{sektor.pengampu}</p>
                )}

                <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${s.link}`}>
                  Lihat Izin
                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <Link
          to="/layanan"
          className="inline-flex items-center gap-2 rounded-xl bg-royal-900 text-white
                     px-7 py-3.5 font-semibold hover:bg-royal-800 transition-colors shadow-floating"
        >
          Lihat Semua Layanan
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { num: "01", title: "Daftar & Verifikasi", body: "Buat akun dengan NIK dan email. Verifikasi dengan OTP satu langkah." },
    { num: "02", title: "Pilih Jenis Izin",    body: "Cari izin dari katalog 31+ layanan, baca persyaratan lengkapnya." },
    { num: "03", title: "Isi & Unggah",        body: "Lengkapi formulir dan dokumen digital secara online, kapan saja." },
    { num: "04", title: "Pantau & Terima",     body: "Lacak proses real-time, terima notifikasi, unduh izin digital Anda." },
  ];

  return (
    <section className="relative bg-gradient-hero py-24 overflow-hidden">
      <GlowOrbs />
      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[11px] text-gold-400 font-bold uppercase tracking-[0.15em] mb-3">Cara Kerja</p>
          <h2 className="font-display text-4xl font-extrabold text-white">Empat Langkah Mudah</h2>
        </motion.div>

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px
                          bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
          {steps.map(({ num, title, body }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="h-16 w-16 rounded-2xl bg-white/8 border border-white/12 backdrop-blur-sm
                              flex items-center justify-center mb-5">
                <span className="font-display text-xl font-extrabold text-gold-400">{num}</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: Clock, iconBg: "bg-royal-100 ring-royal-200", iconColor: "text-royal-600",
      title: "SLA Transparan",
      body: "Setiap tahap punya batas waktu. Pantau kapan izin Anda akan selesai secara real-time.",
    },
    {
      icon: Shield, iconBg: "bg-royal-50 ring-royal-200", iconColor: "text-royal-500",
      title: "Dokumen Terverifikasi",
      body: "Setiap izin digital dilengkapi QR code untuk validasi keaslian kapan saja, di mana saja.",
    },
    {
      icon: Smartphone, iconBg: "bg-gold-300/25 ring-gold-400/40", iconColor: "text-gold-500",
      title: "Notifikasi Aktif",
      body: "Pemberitahuan via email dan WhatsApp di setiap perubahan status permohonan Anda.",
    },
    {
      icon: CheckCircle2, iconBg: "bg-emerald-50 ring-emerald-200", iconColor: "text-emerald-600",
      title: "Tanpa Biaya Layanan",
      body: "Platform 100% gratis untuk masyarakat. Tidak ada biaya administrasi tersembunyi.",
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <p className="section-label mb-3">Keunggulan</p>
        <h2 className="font-display text-4xl font-extrabold text-foreground">Mengapa Lantara?</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4">
        {features.map(({ icon: Icon, iconBg, iconColor, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="card p-6 flex gap-5 hover:shadow-card-hover transition-all duration-200"
          >
            <div className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ring-1 ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">{title}</h3>
              <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── FAQ accordion ──────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Apakah layanan Lantara berbayar?",
    a: "Tidak. Seluruh layanan perizinan melalui Lantara 100% gratis untuk masyarakat. Tidak ada biaya administrasi atau biaya tersembunyi apa pun.",
  },
  {
    q: "Berapa lama proses perizinan?",
    a: "Setiap jenis izin memiliki SLA (batas waktu) tersendiri, umumnya antara 3 hingga 8 hari kerja. Anda dapat memantau progres secara real-time di portal pemohon.",
  },
  {
    q: "Dokumen apa saja yang perlu disiapkan?",
    a: "Persyaratan dokumen berbeda untuk setiap jenis izin dan ditampilkan lengkap di halaman katalog masing-masing izin sebelum Anda mengajukan permohonan.",
  },
  {
    q: "Bagaimana cara memvalidasi izin yang sudah terbit?",
    a: "Setiap izin digital dilengkapi QR code. Pindai QR atau buka halaman Validasi Dokumen untuk memverifikasi keaslian izin secara real-time.",
  },
  {
    q: "Apakah saya bisa mengajukan revisi tanpa mengunggah ulang semua dokumen?",
    a: "Ya. Bila verifikator meminta revisi, Anda hanya perlu memperbaiki bagian atau dokumen yang diminta. Dokumen lain yang sudah valid tetap tersimpan.",
  },
];

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl bg-white ring-1 transition-all duration-200 overflow-hidden
                     ${isOpen ? "ring-royal-500/30 border-l-4 border-royal-600 shadow-sm" : "ring-royal-900/[0.06] border-l-4 border-transparent"}`}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-display font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-royal-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
            <p className="px-5 pb-5 text-sm text-ink-muted leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="max-w-3xl mx-auto px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="section-label mb-3">Pertanyaan Umum</p>
        <h2 className="font-display text-4xl font-extrabold text-foreground">FAQ</h2>
      </motion.div>

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
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-royal-700 via-royal-600 to-royal-800" aria-hidden="true" />
      <div className="absolute inset-0 dot-grid opacity-[0.06] text-white" aria-hidden="true" />
      <div className="absolute top-[-80px] right-[-80px] h-[400px] w-[400px] rounded-full bg-gold-500/15 blur-[120px]" aria-hidden="true" />
      <div className="absolute bottom-[-80px] left-[-60px] h-[360px] w-[360px] rounded-full bg-royal-400/25 blur-[120px]" aria-hidden="true" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-gold-300 text-xs font-bold uppercase tracking-widest mb-4">Mulai Sekarang</p>
          <h2 className="font-display text-4xl font-extrabold text-white mb-5">Siap Mengajukan Izin?</h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Bergabung dengan ribuan pemohon yang telah mendapatkan izin mereka melalui Lantara.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-royal-700
                         px-8 py-4 font-bold text-base hover:bg-royal-50 transition-colors
                         shadow-[0_2px_12px_rgba(3,6,26,0.25)]"
            >
              Daftar Gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/layanan"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30
                         bg-white/10 backdrop-blur-sm px-8 py-4 font-bold text-base text-white
                         hover:bg-white/20 transition-colors"
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
    <footer className="bg-royal-950 border-t-2 border-gold-400/60 py-14">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="space-y-3 max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-lg bg-gradient-royal flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" aria-hidden="true" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              </div>
              <span className="font-display font-extrabold text-white text-lg">Lantara</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              Platform perizinan resmi Otorita Ibu Kota Nusantara (IKN). Layanan online, transparan, dan terpercaya.
            </p>
          </div>

          {/* Links */}
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2.5 text-sm">
            <Link to="/layanan" className="text-white/50 hover:text-white transition-colors">Katalog Layanan</Link>
            <Link to="/auth/register" className="text-white/50 hover:text-white transition-colors">Daftar</Link>
            <Link to="/auth/login" className="text-white/50 hover:text-white transition-colors">Masuk</Link>
            <Link to="/rdtr" className="text-white/50 hover:text-white transition-colors">Peta RDTR</Link>
          </nav>

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Kontak</p>
            <a
              href="https://wa.me/6280000000000"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-gold-400" aria-hidden="true" />
              WhatsApp Resmi
            </a>
            <p className="text-white/40 text-xs">Otorita Ibu Kota Nusantara</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30">
          <span>© 2025 Otorita Ibu Kota Nusantara. Hak Cipta Dilindungi.</span>
          <span>Lantara v2 · IKN Portal</span>
        </div>
      </div>
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
    <div className="bg-background">
      <PublicNav />
      <Hero />
      <main id="main-content">
        <SearchSection />
        <StatsStrip />
        <SektorCards sektors={sektors ?? []} />
        <HowItWorks />
        <Features />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
