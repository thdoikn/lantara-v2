import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Clock, Shield, Smartphone, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import type { Sektor } from "@/types";

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Forest layer dissolves as city layer appears (hutan → kota)
  const forestOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const cityOpacity = useTransform(scrollYProgress, [0, 0.6], [0.15, 0.6]);
  const textY = useTransform(scrollYProgress, [0, 0.5], ["0%", "25%"]);

  return (
    <section
      ref={ref}
      className="relative h-screen overflow-hidden bg-buana-dark flex items-center justify-center"
    >
      {/* Forest layer */}
      <motion.div
        style={{ opacity: forestOpacity }}
        className="absolute inset-0 bg-gradient-to-b from-jagawana-deep via-jagawana to-jagawana/60"
        aria-hidden
      />

      {/* City / plan layer */}
      <motion.div
        style={{ opacity: cityOpacity }}
        className="absolute inset-0 bg-gradient-to-br from-khatulistiwa/40 via-buana-dark to-buana-dark"
        aria-hidden
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      {/* Content */}
      <motion.div
        style={{ y: textY }}
        className="relative z-10 text-center px-4 max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="text-jagawana/80 text-sm font-medium tracking-widest uppercase mb-4">
            Otorita Ibu Kota Nusantara
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white leading-tight mb-6">
            Izin Usahamu,
            <br />
            <span className="text-pertiwi">Lebih Mudah.</span>
          </h1>
          <p className="text-white/70 text-lg sm:text-xl max-w-xl mx-auto mb-10">
            Platform perizinan terpadu untuk Nusantara — dari hutan ke kota, satu portal untuk
            semua izin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/layanan"
              className="inline-flex items-center gap-2 rounded-xl bg-jagawana px-7 py-3.5 text-base font-semibold text-white hover:bg-jagawana-deep transition-colors"
            >
              Lihat Katalog Izin
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-7 py-3.5 text-base font-semibold text-white hover:bg-white/20 transition-colors border border-white/20"
            >
              Daftar Sekarang
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        aria-hidden
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1.5 h-1.5 rounded-full bg-white/60"
          />
        </div>
        <span className="text-xs text-white/40">Scroll</span>
      </motion.div>
    </section>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: "31+", label: "Jenis Layanan" },
    { value: "100%", label: "Online" },
    { value: "3–8", label: "Hari Kerja" },
    { value: "0", label: "Biaya Layanan" },
  ];
  return (
    <div className="bg-jagawana text-white py-8">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map(({ value, label }) => (
          <div key={label}>
            <div className="font-display text-3xl font-bold">{value}</div>
            <div className="text-sm text-white/70 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sektor cards ──────────────────────────────────────────────────────────────

function SektorCards({ sektors }: { sektors: Sektor[] }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="text-xs text-buana uppercase tracking-widest mb-2">Layanan Kami</p>
        <h2 className="font-display text-3xl font-bold">Pilih Sektor Anda</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sektors.map((sektor, i) => (
          <motion.div
            key={sektor.key}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              to={`/layanan#${sektor.key}`}
              className="group block rounded-2xl border border-border bg-white p-6 hover:border-jagawana/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-bold text-lg group-hover:text-jagawana transition-colors">
                    {sektor.name}
                  </p>
                  {sektor.pengampu && (
                    <p className="text-xs text-buana mt-1">{sektor.pengampu}</p>
                  )}
                </div>
                <span className="text-sm text-buana bg-muted px-2 py-0.5 rounded-full shrink-0">
                  {sektor.permit_count} izin
                </span>
              </div>
              <div className="mt-4 flex items-center text-sm text-khatulistiwa opacity-0 group-hover:opacity-100 transition-opacity">
                Lihat layanan <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          to="/layanan"
          className="inline-flex items-center gap-2 rounded-xl bg-jagawana px-6 py-3 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors"
        >
          Lihat Semua Layanan <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { num: "01", title: "Daftar & Verifikasi", body: "Buat akun dengan NIK dan email. Verifikasi dengan OTP." },
    { num: "02", title: "Pilih Jenis Izin", body: "Cari izin dari katalog 31+ layanan, baca persyaratannya." },
    { num: "03", title: "Isi Formulir & Unggah", body: "Lengkapi data dan dokumen secara online, kapan saja." },
    { num: "04", title: "Pantau & Terima", body: "Lacak proses real-time, terima notifikasi, unduh izin digital." },
  ];

  return (
    <section className="bg-buana-dark text-white py-20">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-xs text-jagawana uppercase tracking-widest mb-2">Cara Kerja</p>
          <h2 className="font-display text-3xl font-bold">Empat Langkah Mudah</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ num, title, body }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="space-y-3"
            >
              <div className="font-display text-5xl font-bold text-jagawana/30">{num}</div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{body}</p>
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
      icon: <Clock className="h-6 w-6 text-jagawana" />,
      title: "SLA Transparan",
      body: "Setiap tahap punya batas waktu. Anda tahu kapan izin akan selesai.",
    },
    {
      icon: <Shield className="h-6 w-6 text-jagawana" />,
      title: "Dokumen Terverifikasi",
      body: "Setiap izin digital dilengkapi QR code untuk validasi keaslian.",
    },
    {
      icon: <Smartphone className="h-6 w-6 text-jagawana" />,
      title: "Notifikasi Aktif",
      body: "Pemberitahuan via email dan WhatsApp di setiap perubahan status.",
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-jagawana" />,
      title: "Tanpa Biaya Layanan",
      body: "Platform 100% gratis. Tidak ada biaya administrasi tersembunyi.",
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="text-xs text-buana uppercase tracking-widest mb-2">Keunggulan</p>
        <h2 className="font-display text-3xl font-bold">Mengapa Lantara?</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-6">
        {features.map(({ icon, title, body }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-white p-6 flex gap-4"
          >
            <div className="shrink-0 h-12 w-12 rounded-xl bg-jagawana/10 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-buana mt-1 leading-relaxed">{body}</p>
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
    <section className="bg-jagawana text-white py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl font-bold mb-4">Siap Mengajukan Izin?</h2>
          <p className="text-white/80 mb-8">
            Bergabung dengan ribuan pemohon yang telah mendapatkan izin mereka melalui Lantara.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-jagawana px-7 py-3.5 font-semibold hover:bg-pertiwi transition-colors"
            >
              Mulai Sekarang
            </Link>
            <Link
              to="/layanan"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-7 py-3.5 font-semibold hover:bg-white/20 transition-colors"
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
    <footer className="bg-buana-dark text-white/60 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div>
          <span className="font-display font-bold text-white">Lantara</span> — Platform Perizinan
          Otorita IKN
        </div>
        <div className="flex gap-6">
          <Link to="/layanan" className="hover:text-white transition-colors">
            Layanan
          </Link>
          <Link to="/auth/login" className="hover:text-white transition-colors">
            Masuk
          </Link>
          <Link to="/auth/register" className="hover:text-white transition-colors">
            Daftar
          </Link>
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
