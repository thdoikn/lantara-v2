import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { ElementType } from "react";
import {
  Bell, BellOff, CheckCheck,
  ArrowRightCircle, CheckCircle2, AlertCircle, BadgeCheck,
} from "lucide-react";
import api from "@/lib/api";
import type { Notification } from "@/types";
import { cn } from "@/lib/cn";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

const NOTIF_CONFIG: Record<string, { Icon: ElementType; color: string; bg: string }> = {
  submission_update:   { Icon: ArrowRightCircle, color: "text-khatulistiwa-500", bg: "bg-khatulistiwa-50" },
  submission_approved: { Icon: BadgeCheck,       color: "text-emerald-600",       bg: "bg-emerald-50" },
  revision_requested:  { Icon: AlertCircle,      color: "text-amber-500",         bg: "bg-amber-50" },
  submission_rejected: { Icon: AlertCircle,      color: "text-red-500",           bg: "bg-red-50" },
  permit_issued:       { Icon: CheckCircle2,     color: "text-emerald-600",       bg: "bg-emerald-50" },
};

const DEFAULT_CONFIG: { Icon: ElementType; color: string; bg: string } = {
  Icon: Bell,
  color: "text-khatulistiwa-400",
  bg: "bg-khatulistiwa-50",
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications", "list"],
    queryFn: () => api.get("/notifications/").then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.post("/notifications/mark-read/", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

  function handleClick(n: Notification) {
    if (!n.is_read) markReadMutation.mutate([n.id]);
    if (n.action_url) navigate(n.action_url);
    else if (n.submission_id) navigate(`/portal/submissions/${n.submission_id}`);
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-khatulistiwa-600" aria-hidden="true" />
          <h2 className="text-khatulistiwa-900 font-display font-bold text-xl">Notifikasi</h2>
          {unreadIds.length > 0 && (
            <span className="bg-terakota-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadIds.length} baru
            </span>
          )}
        </div>
        {unreadIds.length > 0 && (
          <button
            onClick={() => markReadMutation.mutate(unreadIds)}
            className="flex items-center gap-1.5 text-khatulistiwa-600 text-sm font-semibold hover:text-khatulistiwa-500 transition-colors"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white animate-pulse border border-khatulistiwa-100/60" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-khatulistiwa-100/60">
          <BellOff className="w-12 h-12 text-khatulistiwa-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-khatulistiwa-600 font-semibold">Belum ada notifikasi</p>
          <p className="text-khatulistiwa-400/60 text-sm mt-1">
            Kami akan memberi tahu ketika ada pembaruan permohonan.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!isLoading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = NOTIF_CONFIG[n.notif_type] ?? DEFAULT_CONFIG;
            const { Icon } = cfg;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                  n.is_read
                    ? "bg-white border-khatulistiwa-100/60 hover:border-khatulistiwa-200"
                    : "bg-khatulistiwa-50/80 border-khatulistiwa-200 hover:border-khatulistiwa-300"
                )}
              >
                {/* Type icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                  cfg.bg
                )}>
                  <Icon className={cn("w-5 h-5", cfg.color)} aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm font-semibold",
                      n.is_read ? "text-khatulistiwa-700" : "text-khatulistiwa-900"
                    )}>
                      {n.title}
                    </p>
                    <span className="text-khatulistiwa-400/50 text-xs flex-shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-khatulistiwa-500/70 text-xs mt-1 leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                  )}
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div className="w-2 h-2 bg-terakota-500 rounded-full flex-shrink-0 mt-2" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
