import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, differenceInHours } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Clock, AlertTriangle, CheckCircle2, RefreshCw, Flame } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft:      "Draft",
  submitted:  "Baru Masuk",
  in_review:  "Diverifikasi",
  revision:   "Revisi Masuk",
  approved:   "Disetujui",
  rejected:   "Ditolak",
  publishing: "Penerbitan",
  collection: "Siap Diambil",
  collected:  "Selesai",
  issued:     "Diterbitkan",
};

const FILTER_TABS: { label: string; statuses: SubmissionStatus[]; accent: string }[] = [
  { label: "Semua Aktif", statuses: ["submitted", "in_review", "revision", "publishing"], accent: "text-khatulistiwa" },
  { label: "Baru Masuk",  statuses: ["submitted"],  accent: "text-amber-600" },
  { label: "Revisi",      statuses: ["revision"],   accent: "text-orange-600" },
  { label: "Selesai",     statuses: ["approved", "collected", "issued", "rejected"], accent: "text-jagawana" },
];

type SLALevel = "breached" | "critical" | "warning" | "ok";

function getSLALevel(dueAt: string | null, breached: boolean): SLALevel {
  if (!dueAt) return "ok";
  if (breached) return "breached";
  const h = differenceInHours(parseISO(dueAt), new Date());
  if (h < 4) return "critical";
  if (h < 24) return "warning";
  return "ok";
}

const SLA_STYLES: Record<SLALevel, { bar: string; bg: string; text: string; icon: React.ReactNode }> = {
  breached: {
    bar: "bg-saka",
    bg: "bg-red-50/60 ring-red-200/60",
    text: "text-saka",
    icon: <Flame className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  critical: {
    bar: "bg-saka/80",
    bg: "bg-red-50/40 ring-red-200/40",
    text: "text-saka",
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  warning: {
    bar: "bg-terakota",
    bg: "bg-amber-50/40 ring-amber-200/40",
    text: "text-amber-700",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  ok: {
    bar: "bg-jagawana/30",
    bg: "",
    text: "text-buana",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

export default function VerifierQueue() {
  const [activeTab, setActiveTab] = useState(0);
  const { statuses } = FILTER_TABS[activeTab];

  const { data, isLoading, refetch, isFetching } = useQuery<PaginatedResponse<Submission>>({
    queryKey: ["verifier-queue", statuses],
    queryFn: () =>
      api.get(`/submissions/?status=${statuses.join(",")}&ordering=sla_due_at`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const submissions = data?.results ?? [];

  return (
    <div className="max-w-3xl space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Antrean Verifikasi</h1>
          <p className="text-sm text-buana mt-0.5">
            {isLoading ? "Memuat…" : `${data?.count ?? 0} permohonan aktif`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary py-2 px-3 text-xs gap-1.5"
          aria-label="Refresh antrean"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 bg-white ring-1 ring-black/[0.06] shadow-sm rounded-xl p-1">
        {FILTER_TABS.map(({ label, accent }, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
              i === activeTab
                ? cn("bg-buana-dark text-white shadow-sm", accent)
                : "text-buana hover:text-foreground hover:bg-muted"
            )}
            style={i === activeTab ? { backgroundColor: "#0D1F5C" } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Cards ── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[88px] rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 text-center space-y-3"
        >
          <CheckCircle2 className="h-10 w-10 text-jagawana mx-auto" aria-hidden="true" />
          <p className="font-semibold">Antrean kosong</p>
          <p className="text-sm text-buana">Tidak ada permohonan dalam kategori ini.</p>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="space-y-2">
          {submissions.map((sub, i) => {
            const level = getSLALevel(sub.sla_due_at, sub.is_sla_breached);
            const sla = SLA_STYLES[level];
            const hoursLeft = sub.sla_due_at
              ? differenceInHours(parseISO(sub.sla_due_at), new Date())
              : null;

            return (
              <motion.div
                key={sub.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
              >
                <Link
                  to={`/verifier/submissions/${sub.id}`}
                  className={cn(
                    "group flex gap-0 rounded-2xl overflow-hidden ring-1 transition-all duration-150",
                    "bg-white hover:shadow-card-hover hover:-translate-y-0.5",
                    level !== "ok"
                      ? cn("ring-1", sla.bg)
                      : "ring-black/[0.06]"
                  )}
                >
                  {/* SLA color bar */}
                  <div className={cn("w-1 shrink-0", sla.bar)} />

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{sub.permit_type_name}</p>
                          <span className="text-[11px] text-buana bg-muted px-2 py-0.5 rounded-full font-medium">
                            {STATUS_LABEL[sub.status]}
                          </span>
                        </div>
                        <p className="text-xs text-buana mt-1">
                          <span className="font-medium text-foreground/80">{sub.applicant_name}</span>
                          {" · "}
                          {sub.reference_number}
                        </p>
                      </div>

                      {/* SLA indicator */}
                      {sub.sla_due_at && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-semibold shrink-0",
                          sla.text,
                          level === "breached" && "animate-pulse"
                        )}>
                          {sla.icon}
                          {sub.is_sla_breached
                            ? "SLA Terlampaui"
                            : hoursLeft !== null && hoursLeft < 24
                            ? `${hoursLeft}j tersisa`
                            : format(parseISO(sub.sla_due_at), "d MMM", { locale: localeId })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-[11px] text-buana">
                        Diajukan:{" "}
                        {sub.submitted_at
                          ? format(parseISO(sub.submitted_at), "d MMM yyyy · HH:mm", { locale: localeId })
                          : "—"}
                      </p>
                      <span className="text-xs text-khatulistiwa opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        Buka →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}
