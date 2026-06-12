import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Clock, CheckCircle2, XCircle, RotateCcw, ArrowRight, FilePlus2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; badge: string }> = {
  draft:       { label: "Draft",               badge: "badge-pending" },
  submitted:   { label: "Diajukan",            badge: "badge-pending" },
  in_review:   { label: "Diverifikasi",        badge: "badge-info" },
  revision:    { label: "Perlu Revisi",        badge: "badge-warn" },
  approved:    { label: "Disetujui",           badge: "badge-success" },
  rejected:    { label: "Ditolak",             badge: "badge-danger" },
  publishing:  { label: "Penerbitan",          badge: "badge-info" },
  collection:  { label: "Siap Diambil",        badge: "badge-success" },
  collected:   { label: "Selesai",             badge: "badge-success" },
  issued:      { label: "Diterbitkan",         badge: "badge-success" },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badge: "badge-pending" };
  return <span className={cn("badge", cfg.badge)}>{cfg.label}</span>;
}

const STATS = [
  {
    key: "total",
    label: "Total Permohonan",
    icon: RotateCcw,
    gradient: "from-khatulistiwa/15 to-khatulistiwa/5",
    iconColor: "text-khatulistiwa",
    ring: "ring-khatulistiwa/15",
  },
  {
    key: "pending",
    label: "Sedang Diproses",
    icon: Clock,
    gradient: "from-amber-100/80 to-amber-50/40",
    iconColor: "text-amber-600",
    ring: "ring-amber-200/60",
  },
  {
    key: "issued",
    label: "Izin Diterbitkan",
    icon: CheckCircle2,
    gradient: "from-jagawana/15 to-jagawana/5",
    iconColor: "text-jagawana",
    ring: "ring-jagawana/20",
  },
  {
    key: "needsAction",
    label: "Perlu Tindakan",
    icon: XCircle,
    gradient: "from-red-100/80 to-red-50/40",
    iconColor: "text-saka",
    ring: "ring-red-200/60",
  },
] as const;

export default function PortalDashboard() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "Pemohon";

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
    <div className="max-w-4xl space-y-7">
      {/* ── Welcome banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-jagawana-deep via-jagawana to-jagawana/80 p-6 text-white"
      >
        {/* Background decoration */}
        <div className="absolute right-0 top-0 h-full w-64 opacity-10"
             style={{
               background: "radial-gradient(circle at 80% 50%, white 0%, transparent 70%)",
             }} />
        <div className="absolute bottom-[-30px] right-12 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute bottom-[-10px] right-[-10px] h-20 w-20 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm">{greeting},</p>
            <h1 className="font-display text-2xl font-bold mt-0.5">{firstName} 👋</h1>
            <p className="text-white/65 text-sm mt-2">
              Pantau dan kelola semua permohonan izin Anda.
            </p>
          </div>
          <Link
            to="/layanan"
            className="shrink-0 flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25
                       border border-white/20 px-4 py-2.5 text-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajukan Baru
          </Link>
        </div>
      </motion.div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(({ key, label, icon: Icon, gradient, iconColor, ring }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.35 }}
            className="card p-4 space-y-3"
          >
            <div className={cn(
              "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1",
              gradient, ring
            )}>
              <Icon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-foreground">
                {isLoading ? <span className="skeleton inline-block w-8 h-7 align-middle" /> : stats[key]}
              </div>
              <div className="text-xs text-buana mt-0.5">{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {!isLoading && submissions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-12 text-center space-y-4"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <FilePlus2 className="h-8 w-8 text-buana" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-lg">Belum ada permohonan</p>
            <p className="text-sm text-buana mt-1 max-w-xs mx-auto">
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-foreground">Permohonan Terbaru</h2>
            <Link
              to="/layanan"
              className="flex items-center gap-1 text-xs text-khatulistiwa font-semibold hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Ajukan Baru
            </Link>
          </div>

          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-2xl" />
                ))
              : submissions.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/portal/submissions/${sub.id}`}
                      className="group card-hover flex items-center gap-4 p-4"
                    >
                      {/* Status color bar */}
                      <div className={cn(
                        "shrink-0 w-1 self-stretch rounded-full",
                        sub.status === "approved" || sub.status === "issued" || sub.status === "collected"
                          ? "bg-jagawana"
                          : sub.status === "rejected"
                          ? "bg-saka"
                          : sub.status === "revision"
                          ? "bg-terakota"
                          : "bg-khatulistiwa"
                      )} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">
                            {sub.permit_type_name ?? sub.reference_number}
                          </p>
                          <StatusBadge status={sub.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-buana">
                          <span>{sub.reference_number}</span>
                          <span>·</span>
                          <span>
                            {format(parseISO(sub.created_at), "d MMM yyyy", { locale: localeId })}
                          </span>
                          {sub.is_sla_breached && (
                            <span className="text-saka font-semibold flex items-center gap-0.5">
                              <XCircle className="h-3 w-3" aria-hidden="true" />
                              SLA lewat
                            </span>
                          )}
                          {sub.is_sla_at_risk && !sub.is_sla_breached && (
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              Mendekati SLA
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight
                        className="h-4 w-4 text-buana opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </motion.div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
