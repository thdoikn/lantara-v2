import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Clock, Shield, Smartphone, CheckCircle2,
  ChevronDown, Search, MessageCircle, Building2,
  LayoutDashboard, ShieldCheck, Settings, Info,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { getPortals, staffPortals, isStaffWithoutRole } from "@/lib/access";
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

// ── Section wave transitions ───────────────────────────────────────────────────

function WaveTransition({ from, to, inverse = false }: { from: string; to: string; inverse?: boolean }) {
  return (
    <div
      style={{ background: from, height: "40px", overflow: "hidden", marginBottom: "-1px", lineHeight: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 40" width="100%" height="40" preserveAspectRatio="none">
        <path
          d={inverse
            ? "M0,0 L0,40 Q720,0 1440,40 L1440,0 Z"
            : "M0,40 L0,0 Q720,40 1440,0 L1440,40 Z"}
          fill={to}
        />
      </svg>
    </div>
  );
}

// ── CHANGE 1 — Hero with integrated search bar ─────────────────────────────────

const HERO_BG = `
  radial-gradient(ellipse 60% 50% at 20% 50%, rgba(24,80,136,0.25) 0%, transparent 60%),
  radial-gradient(ellipse 50% 40% at 80% 30%, rgba(24,80,136,0.15) 0%, transparent 55%),
  radial-gradient(ellipse 80% 60% at 50% 110%, rgba(24,80,136,0.3) 0%, transparent 65%),
  #04182A`;

function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const searchRef = useRef<HTMLInputElement>(null);

  // Global '/' shortcut focuses the search bar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function handleSearchSubmit() {
    navigate(q.trim() ? `/layanan?q=${encodeURIComponent(q.trim())}` : "/layanan");
  }

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center overflow-hidden"
      style={{ background: HERO_BG }}
      aria-label="Hero Lantara"
    >
      <div className="absolute inset-0 dot-grid opacity-[0.04] text-white pointer-events-none" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 pt-24 pb-4 flex flex-col items-center w-full max-w-4xl mx-auto"
      >
        {/* Main heading */}
        <h1
          className="font-display font-black text-white leading-none mb-6"
          style={{ fontSize: "clamp(4rem, 12vw, 9rem)", textShadow: "0 0 80px rgba(46,133,200,0.35)" }}
        >
          Lantara
        </h1>

        <p className="text-khatulistiwa-200/80 font-display font-medium text-xl md:text-2xl mb-3 max-w-2xl">
          Layanan Perizinan Digital Ibu Kota Nusantara
        </p>
        <p className="text-white/40 text-base mb-10 max-w-lg leading-relaxed">
          Satu portal untuk mengajukan, memantau, dan menerima izin Anda — cepat, transparan, dan sepenuhnya digital.
        </p>

        {/* Search bar */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center bg-white/[0.08] border border-white/[0.15] rounded-2xl px-5 py-4 gap-3
                          focus-within:border-terakota-400/50 focus-within:bg-white/[0.11] transition-all
                          shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
            <Search className="w-5 h-5 text-white/30 flex-shrink-0" aria-hidden="true" />
            <input
              ref={searchRef}
              value={q}
              className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
              placeholder="Cari jenis izin, sektor, atau kode KBLI..."
              aria-label="Cari layanan perizinan"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
            />
            <button
              onClick={handleSearchSubmit}
              className="bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white px-5 py-2 rounded-xl
                         font-semibold text-sm transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              Cari
            </button>
          </div>
          <p className="text-white/25 text-xs mt-2.5 text-center">
            Tekan{" "}
            <kbd className="bg-white/10 border border-white/15 px-1.5 py-0.5 rounded text-xs font-mono">
              /
            </kbd>{" "}
            untuk fokus
          </p>
        </div>

        {/* CTA buttons — identical layout for both auth states */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <button
            onClick={() => navigate(isAuthenticated ? "/portal" : "/auth/register")}
            className="inline-flex items-center gap-2 bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white
                       font-display font-semibold px-8 py-3.5 rounded-xl transition-all
                       shadow-lg shadow-khatulistiwa-600/30"
          >
            {isAuthenticated ? "Pantau Permohonan Saya" : "Ajukan Izin Sekarang"}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate("/layanan")}
            className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15]
                       text-white font-semibold px-8 py-3.5 rounded-xl transition-all"
          >
            Lihat Katalog
          </button>
        </div>
      </motion.div>

      {/* Batik border at bottom */}
      <div className="absolute bottom-0 inset-x-0">
        <BatikBorder opacity={0.6} />
      </div>
    </section>
  );
}

// ── Portal access panel (authenticated only) ────────────────────────────────────
// Surfaces exactly the portals the signed-in user may enter. Access is derived
// from RBAC roles (lib/access), so an OIKN employee signed in via SSO without a
// staff role sees only the pemohon portal — never a confusing empty admin view.

const PORTAL_META = {
  pemohon: {
    to: "/portal",
    icon: LayoutDashboard,
    title: "Portal Pemohon",
    desc: "Ajukan & pantau permohonan izin Anda",
  },
  verifier: {
    to: "/verifier",
    icon: ShieldCheck,
    title: "Workspace Verifikator",
    desc: "Verifikasi permohonan sesuai penugasan Anda",
  },
  admin: {
    to: "/admin",
    icon: Settings,
    title: "Panel Admin",
    desc: "Kelola engine perizinan, pengguna & analitik",
  },
} as const;

function AccessPanel() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated || !user) return null;

  const portals = getPortals(user);
  const staff = staffPortals(user);
  // One-click handoff: if the user has exactly one staff portal, spotlight it.
  const primary = staff.length === 1 ? staff[0] : null;
  const firstName = user.full_name?.split(" ")[0] ?? "";

  const keys: Array<keyof typeof PORTAL_META> = ["pemohon", "verifier", "admin"];
  const visible = keys.filter((k) => portals[k]);

  return (
    <section className="bg-[#04182A] px-6 pt-10 pb-14" aria-label="Portal yang dapat Anda akses">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:p-9 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <p className="text-terakota-400 text-xs font-bold tracking-[0.18em] uppercase mb-2">
                Akses Anda
              </p>
              <h2 className="text-white font-display font-bold text-2xl md:text-3xl">
                Selamat datang{firstName ? `, ${firstName}` : ""}
              </h2>
              <p className="text-white/45 text-sm mt-1.5">
                Portal yang dapat Anda akses dengan akun ini:
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((key) => {
              const m = PORTAL_META[key];
              const Icon = m.icon;
              const isPrimary = key === primary;
              return (
                <Link
                  key={key}
                  to={m.to}
                  className={`group flex flex-col gap-3 rounded-2xl border p-5 transition-all ${
                    isPrimary
                      ? "bg-khatulistiwa-600 border-khatulistiwa-400 shadow-[0_12px_40px_rgba(24,80,136,0.45)] hover:-translate-y-1"
                      : "bg-white/[0.05] border-white/10 hover:bg-white/[0.09] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isPrimary ? "bg-white/20" : "bg-white/[0.06]"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    {isPrimary && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-white/15 px-2 py-1 rounded-full">
                        Lanjutkan
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-display font-bold text-base">{m.title}</h3>
                    <p className={`text-sm mt-1 leading-relaxed ${isPrimary ? "text-white/75" : "text-white/45"}`}>
                      {m.desc}
                    </p>
                  </div>
                  <span
                    className={`mt-auto pt-2 inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2.5 transition-all ${
                      isPrimary ? "text-white" : "text-khatulistiwa-300"
                    }`}
                  >
                    Masuk <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>

          {isStaffWithoutRole(user) && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-gold-500/25 bg-gold-500/[0.08] px-4 py-3.5">
              <Info className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-white/65 text-sm leading-relaxed">
                Anda masuk sebagai pegawai OIKN. Belum ada peran verifikator atau admin
                yang ditugaskan, sehingga Anda dapat menggunakan Portal Pemohon seperti biasa.
                Hubungi administrator bila memerlukan akses tambahan.
              </p>
            </div>
          )}
        </div>
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

// ── Sektor cards — CHANGE 2: asymmetric featured center ────────────────────────

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

        {/* Asymmetric featured center grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {sektors.map((sektor, i) => {
            const v = getSektorVisual(sektor.key, sektor.name);
            const Icon = v.Icon;
            const ls = getLightSektorStyle(v.dot);
            const isFeatured = i === 1;

            return (
              <motion.div
                key={sektor.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={isFeatured ? "-mt-4" : ""}
              >
                <Link
                  to={`/layanan#${sektor.key}`}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isFeatured
                      ? "bg-khatulistiwa-800 border-khatulistiwa-600/50 shadow-[0_20px_60px_rgba(24,80,136,0.35)] hover:shadow-[0_28px_80px_rgba(24,80,136,0.5)] hover:-translate-y-2"
                      : "bg-white border-pertiwi-muted shadow-md hover:shadow-xl hover:-translate-y-1.5"
                  }`}
                >
                  {/* Top accent bar */}
                  <div
                    className={`h-1.5 w-full shrink-0 ${isFeatured ? "bg-terakota-500" : ls.topBar}`}
                    aria-hidden="true"
                  />

                  <div className="p-7 flex flex-col flex-1">
                    {/* Icon + count row */}
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        isFeatured ? "bg-white/15" : ls.iconBg
                      }`}>
                        <Icon className={`w-7 h-7 ${isFeatured ? "text-white" : ls.iconText}`} aria-hidden="true" />
                      </div>
                      <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                        isFeatured
                          ? "bg-terakota-500/20 text-terakota-300"
                          : ls.badge
                      }`}>
                        {sektor.permit_count} izin
                      </span>
                    </div>

                    {/* Name + directorate */}
                    <h3 className={`font-display font-black mb-2 ${
                      isFeatured ? "text-white text-2xl" : "text-khatulistiwa-900 text-xl"
                    }`}>
                      {sektor.name}
                    </h3>
                    <p className={`text-sm leading-relaxed mb-6 flex-1 ${
                      isFeatured ? "text-khatulistiwa-200/60" : "text-khatulistiwa-500/70"
                    }`}>
                      {sektor.pengampu || "Layanan perizinan sektor"}
                    </p>

                    {/* Footer CTA */}
                    <div className={`flex items-center justify-between pt-5 border-t ${
                      isFeatured ? "border-white/10" : "border-pertiwi-muted"
                    }`}>
                      <span className={`text-xs ${
                        isFeatured ? "text-khatulistiwa-300/40" : "text-khatulistiwa-400/50"
                      }`}>
                        Layanan aktif
                      </span>
                      <span className={`text-sm font-semibold flex items-center gap-1.5 group-hover:gap-2.5 transition-all ${
                        isFeatured ? "text-terakota-400" : "text-khatulistiwa-600"
                      }`}>
                        Lihat Izin <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
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

// ── Cara Kerja — CHANGE 3: left-align card text ────────────────────────────────

const STEPS = [
  { title: "Daftar & Verifikasi", desc: "Buat akun dengan NIK dan email. Verifikasi dengan OTP satu langkah." },
  { title: "Pilih Jenis Izin", desc: "Cari izin dari katalog 31+ layanan, baca persyaratan lengkapnya." },
  { title: "Isi & Unggah", desc: "Lengkapi formulir dan dokumen digital secara online, kapan saja." },
  { title: "Pantau & Terima", desc: "Lacak proses real-time, terima notifikasi, unduh izin digital Anda." },
];

function HowItWorks() {
  return (
    <section className="bg-[#F5F0E8] pt-16 pb-0">
      <div className="max-w-5xl mx-auto px-8">
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
              className="flex flex-col items-center relative"
            >
              {/* Dark number circle */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-khatulistiwa-800 border-4 border-pertiwi-warm
                              shadow-xl flex items-center justify-center mb-5">
                <span className="text-terakota-400 font-display font-black text-2xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* CHANGE 3 — left-aligned white card */}
              <div className="bg-white rounded-2xl border border-pertiwi-muted shadow-sm p-5 w-full text-left">
                <h3 className="text-khatulistiwa-900 font-display font-bold text-base">{step.title}</h3>
                <p className="text-khatulistiwa-500/70 text-sm mt-2 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* EXIT transition: cream → dark */}
      <svg
        viewBox="0 0 1440 48"
        className="w-full block mt-12"
        preserveAspectRatio="none"
        style={{ height: "48px", display: "block", marginBottom: "-1px" }}
        aria-hidden="true"
      >
        <path d="M0,48 L0,0 Q720,48 1440,0 L1440,48 Z" fill="#04182A" />
      </svg>
    </section>
  );
}

// ── Mengapa Lantara — CHANGE 4: horizontal icon+text layout ───────────────────

const FEATURES = [
  { Icon: Clock,        title: "SLA Transparan",       desc: "Setiap tahap punya batas waktu. Pantau kapan izin Anda akan selesai secara real-time." },
  { Icon: Shield,       title: "Dokumen Terverifikasi", desc: "Setiap izin digital dilengkapi QR code untuk validasi keaslian kapan saja, di mana saja." },
  { Icon: Smartphone,   title: "Notifikasi Aktif",      desc: "Pemberitahuan via email dan WhatsApp di setiap perubahan status permohonan Anda." },
  { Icon: CheckCircle2, title: "Tanpa Biaya Layanan",   desc: "Platform 100% gratis untuk masyarakat. Tidak ada biaya administrasi tersembunyi." },
];

function Features() {
  return (
    <section className="bg-[#04182A] pt-12 pb-0">
      <div className="max-w-5xl mx-auto px-8">
        <div className="text-center mb-14">
          <p className="text-terakota-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">Keunggulan</p>
          <h2 className="text-white font-display font-black text-4xl md:text-5xl">Mengapa Lantara?</h2>
        </div>

        {/* Horizontal icon+text layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group flex gap-5 p-7 rounded-2xl bg-khatulistiwa-900/50 border border-khatulistiwa-700/25
                         hover:bg-khatulistiwa-800/60 hover:border-terakota-500/30 transition-all duration-300 cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-terakota-500/10 border border-terakota-500/20
                              flex items-center justify-center flex-shrink-0 mt-0.5
                              group-hover:bg-terakota-500/20 transition-colors">
                <Icon className="w-5 h-5 text-terakota-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-white font-display font-bold text-lg mb-2">{title}</h3>
                <p className="text-khatulistiwa-300/55 text-sm leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* EXIT transition: dark → cream (no second SVG at top — HowItWorks owns the entry) */}
      <svg
        viewBox="0 0 1440 48"
        className="w-full block mt-12"
        preserveAspectRatio="none"
        style={{ height: "48px", display: "block", marginBottom: "-1px" }}
        aria-hidden="true"
      >
        <path d="M0,48 L0,0 Q720,48 1440,0 L1440,48 Z" fill="#F5F0E8" />
      </svg>
    </section>
  );
}

// ── FAQ — CHANGE 5: swap eyebrow and heading ──────────────────────────────────

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
        {/* CHANGE 5 — FAQ as eyebrow, Pertanyaan Umum as heading */}
        <div className="text-center mb-12">
          <p className="text-terakota-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">FAQ</p>
          <h2 className="text-khatulistiwa-900 font-display font-black text-4xl md:text-5xl">
            Pertanyaan Umum
          </h2>
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

// ── Page — updated rhythm after removing SearchSection ────────────────────────

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
        {/* Authenticated users see their portal access first (dark, continues hero) */}
        <AccessPanel />
        {/* Hero (dark #04182A) → StatsStrip (gold) — BatikBorder inside Hero handles this visually */}
        <StatsStrip />
        {/* gold → cream */}
        <WaveTransition from="#DBAF6C" to="#F5F0E8" />
        {/* Sektor cards + Cara Kerja — both cream, no transition needed */}
        <SektorCards sektors={sektors ?? []} />
        <HowItWorks />
        <Features />
        <FAQ />
        {/* cream → brand blue */}
        <WaveTransition from="#F5F0E8" to="#0D3060" />
        <CTA />
        {/* blue → footer dark */}
        <WaveTransition from="#1E6BA8" to="#04182A" />
      </main>
      <Footer />
    </div>
  );
}
