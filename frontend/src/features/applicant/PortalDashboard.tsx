import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Clock, CheckCircle2, AlertCircle, Layers,
  FilePlus2, ChevronRight, XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

// ── Status badge (standardised) ─────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; classes: string }
> = {
  draft:      { label: "Draft",        classes: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted:  { label: "Diajukan",     classes: "bg-khatulistiwa-100 text-khatulistiwa-700 border-khatulistiwa-200" },
  in_review:  { label: "Ditinjau",     classes: "bg-amber-100 text-amber-700 border-amber-200" },
  revision:   { label: "Revisi",       classes: "bg-orange-100 text-orange-700 border-orange-200" },
  approved:   { label: "Disetujui",    classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected:   { label: "Ditolak",      classes: "bg-red-100 text-red-700 border-red-200" },
  publishing: { label: "Penerbitan",   classes: "bg-khatulistiwa-100 text-khatulistiwa-700 border-khatulistiwa-200" },
  collection: { label: "Siap Diambil", classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  collected:  { label: "Selesai",      classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  issued:     { label: "Diterbitkan",  classes: "bg-emerald-600 text-white border-emerald-700" },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={cn(
      "inline-flex items-center border font-semibold rounded-full px-3 py-1 text-xs",
      cfg.classes
    )}>
      {cfg.label}
    </span>
  );
}

// ── CountUp ──────────────────────────────────────────────────────────────────

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
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
    color: "text-khatulistiwa-600",
    bg: "bg-khatulistiwa-50",
    border: "border-khatulistiwa-100",
  },
  {
    key: "pending" as const,
    label: "Sedang Diproses",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "issued" as const,
    label: "Izin Diterbitkan",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    key: "needsAction" as const,
    label: "Perlu Tindakan",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-100",
  },
];

// ── Status dot colour ────────────────────────────────────────────────────────

function statusDot(status: SubmissionStatus) {
  if (status === "approved" || status === "issued" || status === "collected") return "bg-emerald-500";
  if (status === "rejected") return "bg-red-500";
  if (status === "revision") return "bg-amber-500";
  return "bg-khatulistiwa-400";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<PaginatedResponse<Submission>>({
    queryKey: ["submissions", "my"],
    queryFn: () => api.get("/submissions/?ordering=-created_at").then((r) => r.data),
  });

  const submissions = data?.results ?? [];

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
    <div className="max-w-4xl space-y-6">
      {/* ── Welcome banner ── */}
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

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ key, label, icon: Icon, color, bg, border }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.35 }}
            className={cn(
              "bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow",
              border
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bg)}>
              <Icon className={cn("w-5 h-5", color)} aria-hidden="true" />
            </div>
            <p className="text-khatulistiwa-900 font-display font-black text-3xl tabular-nums">
              {isLoading
                ? <span className="inline-block w-8 h-7 align-middle rounded bg-khatulistiwa-50 animate-pulse" />
                : <CountUp value={stats[key]} />
              }
            </p>
            <p className="text-khatulistiwa-500/60 text-sm mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Empty state ── */}
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
          <Link to="/layanan" className="btn-primary inline-flex">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajukan Izin Pertama
          </Link>
        </motion.div>
      )}

      {/* ── Submissions list ── */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-khatulistiwa-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-khatulistiwa-50 flex items-center justify-between">
            <h2 className="text-khatulistiwa-900 font-display font-bold text-base">Permohonan Terbaru</h2>
            <Link
              to="/layanan"
              className="text-khatulistiwa-600 text-sm font-semibold hover:text-khatulistiwa-500 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Ajukan Baru
            </Link>
          </div>

          {/* Rows */}
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
                        <p className="text-khatulistiwa-400 text-xs mt-0.5">
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
    </div>
  );
}
