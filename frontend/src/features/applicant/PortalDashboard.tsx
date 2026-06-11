import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { PaginatedResponse, Submission, SubmissionStatus } from "@/types";

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "badge-pending" },
  submitted: { label: "Diajukan", className: "badge-pending" },
  in_review: { label: "Sedang Diverifikasi", className: "badge-info" },
  revision: { label: "Perlu Revisi", className: "badge-warn" },
  approved: { label: "Disetujui", className: "badge-success" },
  rejected: { label: "Ditolak", className: "badge-danger" },
  publishing: { label: "Penerbitan", className: "badge-info" },
  collection: { label: "Siap Diambil", className: "badge-success" },
  collected: { label: "Selesai", className: "badge-success" },
  issued: { label: "Diterbitkan", className: "badge-success" },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "badge-pending" };
  return <span className={cn("badge", cfg.className)}>{cfg.label}</span>;
}

function SLAIndicator({ sub }: { sub: Submission }) {
  if (!sub.sla_due_at) return null;
  if (sub.is_sla_breached) {
    return (
      <span className="flex items-center gap-1 text-xs text-saka font-medium">
        <XCircle className="h-3.5 w-3.5" /> SLA terlampaui
      </span>
    );
  }
  if (sub.is_sla_at_risk) {
    return (
      <span className="flex items-center gap-1 text-xs text-terakota font-medium">
        <Clock className="h-3.5 w-3.5" /> Mendekati batas SLA
      </span>
    );
  }
  return null;
}

export default function PortalDashboard() {
  const { user } = useAuthStore();

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

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold">
          Selamat datang, {user?.full_name.split(" ")[0]}
        </h1>
        <p className="text-buana text-sm mt-1">
          Pantau status permohonan izin Anda di sini.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Permohonan", value: stats.total, icon: RotateCcw, color: "text-khatulistiwa" },
          { label: "Sedang Diproses", value: stats.pending, icon: Clock, color: "text-terakota" },
          { label: "Izin Diterbitkan", value: stats.issued, icon: CheckCircle2, color: "text-jagawana" },
          { label: "Perlu Tindakan", value: stats.needsAction, icon: XCircle, color: "text-saka" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-white p-4">
            <div className={cn("mb-2", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-buana mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* CTA if no submissions */}
      {!isLoading && submissions.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-4">
          <div className="text-4xl">📋</div>
          <p className="font-medium">Belum ada permohonan</p>
          <p className="text-sm text-buana">Mulai ajukan izin dari katalog layanan kami.</p>
          <Link
            to="/layanan"
            className="inline-flex items-center gap-2 rounded-lg bg-jagawana px-5 py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajukan Izin Baru
          </Link>
        </div>
      )}

      {/* Submissions list */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-buana uppercase tracking-wide">
              Permohonan Terbaru
            </h2>
            <Link
              to="/layanan"
              className="flex items-center gap-1.5 text-sm text-khatulistiwa hover:underline"
            >
              <Plus className="h-4 w-4" /> Ajukan Baru
            </Link>
          </div>

          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))
            : submissions.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/portal/submissions/${sub.id}`}
                  className="block rounded-xl border border-border bg-white p-4 hover:border-jagawana/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {sub.permit_type_name ?? sub.reference_number}
                      </p>
                      <p className="text-xs text-buana mt-0.5">{sub.reference_number}</p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-buana">
                      {format(parseISO(sub.created_at), "d MMM yyyy", { locale: localeId })}
                    </span>
                    <SLAIndicator sub={sub} />
                  </div>
                </Link>
              ))}
        </div>
      )}
    </div>
  );
}
