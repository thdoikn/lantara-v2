import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { format, parseISO, differenceInHours } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Clock, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

// SLA age color: >75% elapsed → saka, 50–75% → terakota, else normal
function slaAgeClass(dueAt: string | null, breached: boolean): string {
  if (!dueAt) return "";
  if (breached) return "border-l-saka bg-saka/5";
  const hoursLeft = differenceInHours(parseISO(dueAt), new Date());
  if (hoursLeft < 8) return "border-l-saka bg-saka/5";
  if (hoursLeft < 24) return "border-l-terakota bg-terakota/5";
  return "border-l-border";
}

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Baru Masuk",
  under_review: "Sedang Diverifikasi",
  awaiting_revision: "Menunggu Revisi",
  revision_submitted: "Revisi Masuk",
  site_visit_scheduled: "Kunjungan Dijadwalkan",
  approved: "Disetujui",
  rejected: "Ditolak",
  issued: "Diterbitkan",
};

const FILTER_TABS: { label: string; statuses: SubmissionStatus[] }[] = [
  { label: "Semua Aktif", statuses: ["submitted", "under_review", "revision_submitted", "site_visit_scheduled"] },
  { label: "Baru", statuses: ["submitted"] },
  { label: "Revisi Masuk", statuses: ["revision_submitted"] },
  { label: "Selesai", statuses: ["approved", "issued", "rejected"] },
];

export default function VerifierQueue() {
  const [activeTab, setActiveTab] = useState(0);

  const { statuses } = FILTER_TABS[activeTab];

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<Submission>>({
    queryKey: ["verifier-queue", statuses],
    queryFn: () =>
      api
        .get(`/submissions/?status=${statuses.join(",")}&ordering=sla_due_at`)
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  const submissions = data?.results ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Antrean Verifikasi</h1>
          <p className="text-sm text-buana mt-0.5">
            {data?.count ?? 0} permohonan
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-buana hover:text-foreground transition-colors"
        >
          <Filter className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {FILTER_TABS.map(({ label }, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              i === activeTab
                ? "bg-white text-foreground shadow-sm"
                : "text-buana hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <div className="rounded-xl border border-border bg-white p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-jagawana mx-auto mb-2" />
          <p className="font-medium">Tidak ada permohonan dalam kategori ini</p>
        </div>
      )}

      <div className="space-y-2">
        {submissions.map((sub) => {
          const ageClass = slaAgeClass(sub.sla_due_at, sub.is_sla_breached);
          const hoursLeft = sub.sla_due_at
            ? differenceInHours(parseISO(sub.sla_due_at), new Date())
            : null;

          return (
            <Link
              key={sub.id}
              to={`/verifier/submissions/${sub.id}`}
              className={cn(
                "block rounded-xl border-l-4 border border-border bg-white p-4 hover:shadow-sm transition-all",
                ageClass
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{sub.permit_type_name}</p>
                    <span className="text-xs text-buana px-2 py-0.5 rounded-full bg-muted">
                      {STATUS_LABEL[sub.status]}
                    </span>
                  </div>
                  <p className="text-xs text-buana mt-0.5">
                    {sub.reference_number} · {sub.applicant_name}
                  </p>
                </div>

                {sub.sla_due_at && (
                  <div className="text-right shrink-0">
                    {sub.is_sla_breached || (hoursLeft !== null && hoursLeft < 8) ? (
                      <span className="flex items-center gap-1 text-xs text-saka font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {sub.is_sla_breached
                          ? "SLA Terlampaui"
                          : `${hoursLeft}j tersisa`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-buana">
                        <Clock className="h-3.5 w-3.5" />
                        {hoursLeft !== null && hoursLeft < 24
                          ? `${hoursLeft}j tersisa`
                          : format(parseISO(sub.sla_due_at), "d MMM", { locale: localeId })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-buana mt-2">
                Diajukan:{" "}
                {sub.submitted_at
                  ? format(parseISO(sub.submitted_at), "d MMM yyyy HH:mm", { locale: localeId })
                  : "—"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
