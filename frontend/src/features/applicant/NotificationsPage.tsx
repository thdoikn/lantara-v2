import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-ink" />
          <h1 className="font-display text-lg font-bold">Notifikasi</h1>
        </div>
        {unreadIds.length > 0 && (
          <button
            onClick={() => markReadMutation.mutate(unreadIds)}
            className="flex items-center gap-1.5 text-xs text-royal-600 hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-20 text-ink-muted">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada notifikasi.</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={cn(
              "w-full text-left rounded-xl border p-4 transition-colors hover:bg-royal-50",
              n.is_read
                ? "border-border bg-white"
                : "border-royal-200 bg-royal-50/50"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", !n.is_read && "text-royal-700")}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{n.body}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.is_read && (
                  <span className="h-2 w-2 rounded-full bg-royal-600" />
                )}
                <span className="text-xs text-ink-faint">{timeAgo(n.created_at)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
