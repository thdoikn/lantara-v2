import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Clock, CheckCircle2, AlertCircle, Layers,
  FilePlus2, ChevronRight, XCircle,
  Building2, Stethoscope, Handshake, GraduationCap,
  Eye, Send, PenLine, Package, BadgeCheck, Loader2, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

// ── Status badge — left bar + icon ────────────────────────────────────────────

type StatusCfg = { label: string; icon: LucideIcon; bar: string; bg: string; text: string };

const STATUS_CONFIG: Record<SubmissionStatus, StatusCfg> = {
  draft:      { label: "Draft",        icon: FileText,     bar: "bg-slate-400",        bg: "bg-slate-50",        text: "text-slate-700"        },
  submitted:  { label: "Diajukan",     icon: Send,         bar: "bg-khatulistiwa-400", bg: "bg-khatulistiwa-50", text: "text-khatulistiwa-700" },
  in_review:  { label: "Ditinjau",     icon: Eye,          bar: "bg-amber-400",        bg: "bg-amber-50",        text: "text-amber-700"        },
  revision:   { label: "Revisi",       icon: PenLine,      bar: "bg-orange-400",       bg: "bg-orange-50",       text: "text-orange-700"       },
  approved:   { label: "Disetujui",    icon: CheckCircle2, bar: "bg-emerald-400",      bg: "bg-emerald-50",      text: "text-emerald-700"      },
  rejected:   { label: "Ditolak",      icon: XCircle,      bar: "bg-red-400",          bg: "bg-red-50",          text: "text-red-700"          },
  publishing: { label: "Penerbitan",   icon: Loader2,      bar: "bg-blue-400",         bg: "bg-blue-50",         text: "text-blue-700"         },
  collection: { label: "Siap Diambil", icon: Package,      bar: "bg-teal-400",         bg: "bg-teal-50",         text: "text-teal-700"         },
  collected:  { label: "Selesai",      icon: BadgeCheck,   bar: "bg-khatulistiwa-400", bg: "bg-khatulistiwa-50", text: "text-khatulistiwa-700" },
  issued:     { label: "Diterbitkan",  icon: BadgeCheck,   bar: "bg-emerald-500",      bg: "bg-emerald-100",     text: "text-emerald-700"      },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <div className={cn("inline-flex items-center overflow-hidden rounded-lg", cfg.bg)}>
      <div className={cn("w-1 self-stretch flex-shrink-0", cfg.bar)} />
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5", cfg.text)}>
        <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold whitespace-nowrap">{cfg.label}</span>
      </div>
    </div>
  );
}

// ── CountUp ───────────────────────────────────────────────────────────────────

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value); return;
    }
    if (value <= 0) { setN(0); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 750;
    const step = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

// ── Stat config ───────────────────────────────────────────────────────────────

const STATS = [
  {
    key: "total" as const,
    label: "Total Permohonan",
    icon: Layers,
    navy: true,
    iconBg: "bg-white/10",
    iconColor: "text-terakota-400",
    numColor: "text-white",
    labelColor: "text-khatulistiwa-200/70",
    cardBg: "",
    cardBorder: "",
  },
  {
    key: "pending" as const,
    label: "Sedang Diproses",
    icon: Clock,
    navy: false,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    numColor: "text-khatulistiwa-900",
    labelColor: "text-khatulistiwa-600/70",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-200",
  },
  {
    key: "issued" as const,
    label: "Izin Diterbitkan",
    icon: CheckCircle2,
    navy: false,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    numColor: "text-khatulistiwa-900",
    labelColor: "text-khatulistiwa-600/70",
    cardBg: "bg-emerald-50",
    cardBorder: "border-emerald-200",
  },
  {
    key: "needsAction" as const,
    label: "Perlu Tindakan",
    icon: AlertCircle,
    navy: false,
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
    numColor: "text-khatulistiwa-900",
    labelColor: "text-khatulistiwa-600/70",
    cardBg: "bg-red-50",
    cardBorder: "border-red-200",
  },
];

// ── Status dot colour ─────────────────────────────────────────────────────────

function statusDot(status: SubmissionStatus) {
  if (status === "approved" || status === "issued" || status === "collected") return "bg-emerald-500";
  if (status === "rejected") return "bg-red-500";
  if (status === "revision") return "bg-amber-500";
  return "bg-khatulistiwa-400";
}

// ── Sektor theme for catalog cards ────────────────────────────────────────────

type SektorTheme = { accent: string; iconBg: string; iconColor: string; Icon: LucideIcon };

function getSektorTheme(name: string): SektorTheme {
  const l = name.toLowerCase();
  if (l.includes("kesehatan"))  return { accent: "bg-rose-400",        iconBg: "bg-rose-50",        iconColor: "text-rose-500",        Icon: Stethoscope };
  if (l.includes("sosial"))     return { accent: "bg-violet-400",      iconBg: "bg-violet-50",      iconColor: "text-violet-500",      Icon: Handshake   };
  if (l.includes("pendidikan")) return { accent: "bg-blue-400",        iconBg: "bg-blue-50",        iconColor: "text-blue-500",        Icon: GraduationCap };
  return                               { accent: "bg-khatulistiwa-400", iconBg: "bg-khatulistiwa-50", iconColor: "text-khatulistiwa-600", Icon: Building2   };
}

// ── Catalog item type ─────────────────────────────────────────────────────────

type CatalogItem = { key: string; name: string; sektor_name: string; sla_days: number };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<PaginatedResponse<Submission>>({
    queryKey: ["submissions", "my"],
    queryFn: () => api.get("/submissions/?ordering=-created_at").then((r) => r.data),
  });

  const { data: catalogData } = useQuery<PaginatedResponse<CatalogItem>>({
    queryKey: ["permit-types", "catalog-preview"],
    queryFn: () => api.get("/permit-types/?page_size=4&ordering=name").then((r) => r.data),
  });

  const submissions = data?.results ?? [];
  const catalogItems = catalogData?.results.slice(0, 4) ?? [];

  const stats = {
    total: data?.count ?? 0,
    pending: submissions.filter((s) =>
      ["submitted", "in_review", "publishing", "collection"].includes(s.status)
    ).length,
    issued: submissions.filter((s) => ["issued", "collected"].includes(s.status)).length,
    needsAction: submissions.filter((s) => s.status === "revision").length,
  };

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D3060 0%, #185088 60%, #1E6BA8 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 100% 50%, #DBAF6C33, transparent)" }}
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-khatulistiwa-200/70 text-sm mb-1">{greeting},</p>
            <h1 className="text-white font-display font-black text-3xl">
              {user?.full_name?.split(" ")[0] ?? "Pemohon"} 👋
            </h1>
            <p className="text-khatulistiwa-200/60 text-sm mt-2">
              Pantau dan kelola semua permohonan izin Anda.
            </p>
          </div>
          <Link
            to="/layanan"
            className="shrink-0 flex items-center gap-2 bg-terakota-500 hover:bg-terakota-400
                       text-khatulistiwa-900 font-display font-bold px-6 py-3 rounded-xl
                       transition-all shadow-lg shadow-terakota-500/30"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Ajukan Baru
          </Link>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.35 }}
              className={cn(
                "rounded-2xl overflow-hidden hover:shadow-lg transition-shadow relative",
                s.navy
                  ? "shadow-lg shadow-khatulistiwa-900/30"
                  : cn("border shadow-sm", s.cardBorder, s.cardBg)
              )}
              style={s.navy ? { background: "linear-gradient(135deg, #0D3060 0%, #185088 100%)" } : undefined}
            >
              {s.navy && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 80% 60% at 100% 0%, #DBAF6C22, transparent)" }}
                  aria-hidden="true"
                />
              )}
              {/* min-h + flex-col justify-between: icon top, number+label bottom */}
              <div className="p-5 relative flex flex-col justify-between min-h-[140px]">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.iconBg)}>
                  <Icon className={cn("w-5 h-5", s.iconColor)} aria-hidden="true" />
                </div>
                <div>
                  <p className={cn("font-display font-black text-3xl tabular-nums leading-none", s.numColor)}>
                    {isLoading
                      ? <span className={cn("inline-block w-8 h-7 align-middle rounded animate-pulse", s.navy ? "bg-white/20" : "bg-khatulistiwa-100")} />
                      : <CountUp value={stats[s.key]} />
                    }
                  </p>
                  <p className={cn("text-sm mt-1.5", s.labelColor)}>{s.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {!isLoading && submissions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm p-12 text-center space-y-4"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-khatulistiwa-50 flex items-center justify-center">
            <FilePlus2 className="h-8 w-8 text-khatulistiwa-400" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-khatulistiwa-900 text-lg">Belum ada permohonan</p>
            <p className="text-sm text-khatulistiwa-400/70 mt-1 max-w-xs mx-auto">
              Mulai ajukan izin dari katalog layanan kami. Proses 100% online.
            </p>
          </div>
          <Link
            to="/layanan"
            className="inline-flex items-center gap-2 bg-khatulistiwa-600 hover:bg-khatulistiwa-500 text-white font-display font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-khatulistiwa-600/20"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajukan Izin Pertama
          </Link>
        </motion.div>
      )}

      {/* Submissions list */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-khatulistiwa-50">
            <h2 className="text-khatulistiwa-900 font-display font-bold text-base">Permohonan Terbaru</h2>
          </div>

          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4 border-b border-khatulistiwa-50 last:border-0">
                  <div className="h-5 w-48 rounded bg-khatulistiwa-50 animate-pulse mb-2" />
                  <div className="h-3.5 w-32 rounded bg-khatulistiwa-50 animate-pulse" />
                </div>
              ))
            : submissions.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    onClick={() => navigate(`/portal/submissions/${sub.id}`)}
                    className="px-5 py-4 flex items-center justify-between hover:bg-khatulistiwa-50/50
                               cursor-pointer transition-colors border-b border-khatulistiwa-50 last:border-0"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDot(sub.status))} />
                      <div className="min-w-0">
                        <p className="text-khatulistiwa-900 font-semibold text-sm truncate">
                          {sub.permit_type_name ?? sub.reference_number}
                        </p>
                        <p className="text-khatulistiwa-400/60 text-xs mt-0.5 font-mono">
                          {sub.reference_number} ·{" "}
                          {format(parseISO(sub.created_at), "d MMM yyyy", { locale: localeId })}
                          {sub.is_sla_breached && (
                            <span className="text-red-500 font-semibold ml-2 inline-flex items-center gap-0.5">
                              <XCircle className="h-3 w-3" aria-hidden="true" />
                              SLA lewat
                            </span>
                          )}
                          {sub.is_sla_at_risk && !sub.is_sla_breached && (
                            <span className="text-amber-600 font-semibold ml-2 inline-flex items-center gap-0.5">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              Mendekati SLA
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={sub.status} />
                      <ChevronRight className="w-4 h-4 text-khatulistiwa-300" aria-hidden="true" />
                    </div>
                  </div>
                </motion.div>
              ))}
        </div>
      )}

      {/* Catalog shortcut */}
      <div className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-khatulistiwa-50 flex items-center justify-between">
          <h2 className="text-khatulistiwa-900 font-display font-bold text-base">Ajukan Izin Lainnya</h2>
          <button
            onClick={() => navigate("/layanan")}
            className="flex items-center gap-1 text-sm text-khatulistiwa-600 font-semibold hover:text-khatulistiwa-500 transition-colors"
          >
            Lihat Semua <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {catalogItems.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 rounded-xl bg-khatulistiwa-50 animate-pulse" />
              ))
            : catalogItems.map((pt) => {
                const sektor = getSektorTheme(pt.sektor_name);
                const SektorIcon = sektor.Icon;
                return (
                  <Link
                    key={pt.key}
                    to={`/portal/ajukan/${pt.key}`}
                    className="rounded-xl border border-khatulistiwa-100 hover:border-khatulistiwa-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group"
                  >
                    <div className={cn("h-1 w-full", sektor.accent)} />
                    <div className="p-4 bg-white flex flex-col gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", sektor.iconBg)}>
                        <SektorIcon className={cn("w-4 h-4", sektor.iconColor)} aria-hidden="true" />
                      </div>
                      <h4 className="text-khatulistiwa-900 font-semibold text-sm leading-snug line-clamp-2">
                        {pt.name}
                      </h4>
                      <div className="flex items-center justify-between pt-2 border-t border-khatulistiwa-50 mt-auto">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-khatulistiwa-400/50 flex-shrink-0" aria-hidden="true" />
                          <span className="text-khatulistiwa-500/60 text-xs">{pt.sla_days ?? "—"} hari kerja</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-khatulistiwa-300 group-hover:text-khatulistiwa-500 transition-colors" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
