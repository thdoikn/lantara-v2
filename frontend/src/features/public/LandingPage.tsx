import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Clock, Shield, Smartphone, CheckCircle2,
  Zap, MapPin, FileCheck, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import type { Sektor } from "@/types";

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const forestOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const cityOpacity   = useTransform(scrollYProgress, [0, 0.6], [0.12, 0.55]);
  const textY         = useTransform(scrollYProgress, [0, 0.5], ["0%", "22%"]);
  const badgeY        = useTransform(scrollYProgress, [0, 0.4], ["0%", "40%"]);

  return (
    <section
      ref={ref}
      className="relative h-screen min-h-[680px] overflow-hidden flex items-center justify-center bg-buana-darker"
      aria-label="Hero Lantara"
    >
      {/* Layer 1: Forest (fades out) */}
      <motion.div
        style={{ opacity: forestOpacity }}
        className="absolute inset-0 bg-gradient-to-b from-jagawana-deep via-[#264d25] to-buana-dark"
        aria-hidden="true"
      />

      {/* Layer 2: City/blueprint (fades in) */}
      <motion.div
        style={{ opacity: cityOpacity }}
        className="absolute inset-0 bg-gradient-to-br from-khatulistiwa/30 via-buana-dark to-buana-darker"
        aria-hidden="true"
      />

      {/* Radial glow — top left */}
      <div className="absolute top-[-120px] left-[-80px] h-[600px] w-[600px] rounded-full
                      bg-jagawana/12 blur-[140px] pointer-events-none" aria-hidden="true" />
      {/* Radial glow — bottom right */}
      <div className="absolute bottom-[-80px] right-[-80px] h-[400px] w-[400px] rounded-full
                      bg-khatulistiwa/10 blur-[120px] pointer-events-none" aria-hidden="true" />

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-[0.06] text-white pointer-events-none" aria-hidden="true" />

      {/* Horizontal line accents */}
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 top-2/3 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" aria-hidden="true" />

      {/* Content */}
      <motion.div
        style={{ y: textY }}
        className="relative z-10 text-center px-4 max-w-4xl mx-auto"
      >
        {/* Badge */}
        <motion.div
          style={{ y: badgeY }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm
                     border border-white/15 px-4 py-1.5 text-xs text-white/80 font-medium mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-jagawana animate-pulse" aria-hidden="true" />
          Portal Resmi Otorita Ibu Kota Nusantara
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-5xl sm:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Izin Usahamu,
            <br />
            <span className="bg-gradient-to-r from-jagawana-light via-pertiwi to-terakota bg-clip-text text-transparent">
              Lebih Mudah.
            </span>
          </h1>
          <p className="text-white/60 text-lg sm:text-xl max-w-lg mx-auto mb-10 leading-relaxed">
            Platform perizinan terpadu untuk Nusantara — dari hutan ke kota, satu portal untuk semua izin.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/layanan"
              className="inline-flex items-center justify-center gap-2 rounded-2xl
                         bg-gradient-to-b from-jagawana to-jagawana-deep px-8 py-4 text-base font-bold text-white
                         shadow-[0_2px_8px_rgba(66,138,64,0.5)] hover:shadow-[0_4px_20px_rgba(66,138,64,0.6)]
                         hover:brightness-110 transition-all duration-200"
            >
              Lihat Katalog Izin
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl
                         border border-white/20 bg-white/10 backdrop-blur-sm
                         px-8 py-4 text-base font-bold text-white
                         hover:bg-white/18 hover:border-white/30 transition-all duration-200"
            >
              Daftar Gratis
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/35"
        aria-hidden="true"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="h-px w-px border-2 border-white/30 border-t-0 border-l-0 w-2 h-2 rotate-45"
        />
      </motion.div>
    </section>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: "31+", label: "Jenis Izin", icon: FileCheck },
    { value: "3–8", label: "Hari Kerja", icon: Clock },
    { value: "100%", label: "Online",    icon: Zap },
    { value: "Gratis", label: "Layanan", icon: CheckCircle2 },
  ];

  return (
    <div className="bg-buana-dark border-b border-white/8 py-6">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden">
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="bg-buana-dark/95 px-6 py-5 flex flex-col items-center gap-1.5">
            <Icon className="h-4 w-4 text-jagawana mb-1" aria-hidden="true" />
            <div className="font-display text-2xl font-extrabold text-white">{value}</div>
            <div className="text-xs text-white/45 font-medium">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sektor cards ──────────────────────────────────────────────────────────────

const SEKTOR_COLORS = [
  { bg: "from-jagawana/12 to-jagawana/4", accent: "bg-jagawana/15", text: "text-jagawana" },
  { bg: "from-khatulistiwa/12 to-khatulistiwa/4", accent: "bg-khatulistiwa/12", text: "text-khatulistiwa" },
  { bg: "from-amber-500/10 to-amber-400/4", accent: "bg-amber-500/12", text: "text-amber-700" },
  { bg: "from-purple-500/10 to-purple-400/4", accent: "bg-purple-500/10", text: "text-purple-700" },
  { bg: "from-rose-500/10 to-rose-400/4", accent: "bg-rose-500/10", text: "text-rose-700" },
  { bg: "from-teal-500/10 to-teal-400/4", accent: "bg-teal-500/10", text: "text-teal-700" },
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
        <h2 className="font-display text-4xl font-extrabold text-foreground">
          Pilih Sektor Anda
        </h2>
        <p className="mt-4 text-buana max-w-md mx-auto text-base">
          31+ jenis izin tersedia secara digital, dikategori per sektor layanan.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sektors.map((sektor, i) => {
          const color = SEKTOR_COLORS[i % SEKTOR_COLORS.length];
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
                className={`group block rounded-3xl p-6 bg-gradient-to-br ${color.bg}
                            ring-1 ring-black/[0.06] hover:ring-black/[0.12]
                            hover:shadow-card-hover transition-all duration-200 hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-2xl ${color.accent} flex items-center justify-center`}>
                    <MapPin className={`h-5 w-5 ${color.text}`} aria-hidden="true" />
                  </div>
                  <span className={`text-xs font-semibold ${color.text} bg-white/70 px-2.5 py-1 rounded-full`}>
                    {sektor.permit_count} izin
                  </span>
                </div>

                <p className={`font-display font-bold text-lg text-foreground group-hover:${color.text} transition-colors`}>
                  {sektor.name}
                </p>
                {sektor.pengampu && (
                  <p className="text-xs text-buana mt-1">{sektor.pengampu}</p>
                )}

                <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${color.text}
                                 opacity-0 group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0
                                 transition-all duration-200`}>
                  Lihat layanan
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <Link
          to="/layanan"
          className="inline-flex items-center gap-2 rounded-2xl bg-buana-dark text-white
                     px-7 py-4 font-semibold hover:bg-buana-darker transition-colors shadow-floating"
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
    <section className="bg-buana-dark py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[11px] text-jagawana/80 font-bold uppercase tracking-[0.15em] mb-3">
            Cara Kerja
          </p>
          <h2 className="font-display text-4xl font-extrabold text-white">Empat Langkah Mudah</h2>
        </motion.div>

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px
                          bg-gradient-to-r from-transparent via-white/12 to-transparent" aria-hidden="true" />

          {steps.map(({ num, title, body }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Number circle */}
              <div className="h-16 w-16 rounded-2xl bg-white/6 border border-white/10
                              flex items-center justify-center mb-5">
                <span className="font-display text-xl font-extrabold text-jagawana">{num}</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{body}</p>
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
      icon: Clock,
      iconBg: "bg-khatulistiwa/10 ring-khatulistiwa/15",
      iconColor: "text-khatulistiwa",
      title: "SLA Transparan",
      body: "Setiap tahap punya batas waktu. Pantau kapan izin Anda akan selesai secara real-time.",
    },
    {
      icon: Shield,
      iconBg: "bg-jagawana/10 ring-jagawana/15",
      iconColor: "text-jagawana",
      title: "Dokumen Terverifikasi",
      body: "Setiap izin digital dilengkapi QR code untuk validasi keaslian kapan saja, di mana saja.",
    },
    {
      icon: Smartphone,
      iconBg: "bg-amber-500/10 ring-amber-200/50",
      iconColor: "text-amber-700",
      title: "Notifikasi Aktif",
      body: "Pemberitahuan via email dan WhatsApp di setiap perubahan status permohonan Anda.",
    },
    {
      icon: CheckCircle2,
      iconBg: "bg-purple-500/10 ring-purple-200/50",
      iconColor: "text-purple-700",
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
            className="card p-6 flex gap-5 group hover:shadow-card-hover transition-all duration-200"
          >
            <div className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ring-1 ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">{title}</h3>
              <p className="text-sm text-buana mt-1.5 leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-jagawana-deep via-jagawana to-[#3a7a38]" aria-hidden="true" />
      <div className="absolute inset-0 dot-grid opacity-[0.06] text-white" aria-hidden="true" />
      <div className="absolute top-[-80px] right-[-80px] h-[400px] w-[400px] rounded-full
                      bg-khatulistiwa/20 blur-[120px]" aria-hidden="true" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-pertiwi/70 text-xs font-bold uppercase tracking-widest mb-4">
            Mulai Sekarang
          </p>
          <h2 className="font-display text-4xl font-extrabold text-white mb-5">
            Siap Mengajukan Izin?
          </h2>
          <p className="text-white/65 text-lg mb-10 leading-relaxed">
            Bergabung dengan ribuan pemohon yang telah mendapatkan izin mereka melalui Lantara.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-jagawana-deep
                         px-8 py-4 font-bold text-base hover:bg-pertiwi transition-colors
                         shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
            >
              Daftar Gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/layanan"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25
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
    <footer className="bg-buana-darker border-t border-white/6 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-jagawana flex items-center justify-center">
                <span className="text-white text-xs font-bold">L</span>
              </div>
              <span className="font-display font-bold text-white">Lantara</span>
            </div>
            <p className="text-white/35 text-xs max-w-xs leading-relaxed">
              Platform perizinan resmi Otorita Ibu Kota Nusantara (IKN). Layanan online, transparan, dan terpercaya.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
            <Link to="/layanan" className="text-white/45 hover:text-white transition-colors">Katalog Layanan</Link>
            <Link to="/auth/register" className="text-white/45 hover:text-white transition-colors">Daftar</Link>
            <Link to="/auth/login" className="text-white/45 hover:text-white transition-colors">Masuk</Link>
            <Link to="/rdtr" className="text-white/45 hover:text-white transition-colors">Peta RDTR</Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/25">
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
    <div>
      <Hero />
      <main id="main-content">
        <StatsStrip />
        <SektorCards sektors={sektors ?? []} />
        <HowItWorks />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
