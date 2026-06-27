import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth";
import { toast } from "@/lib/toast";

/**
 * Live notifications over WebSocket. Connects to /ws/notifications/?token=<jwt>,
 * keeps the unread-count query fresh, toasts incoming notifications, and
 * invalidates the notifications list. Auto-reconnects with backoff. The 30s
 * REST poll stays as a fallback for when the socket is down.
 */
export function useNotificationSocket(enabled = true) {
  const qc = useQueryClient();
  const retry = useRef(0);
  const closed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    closed.current = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const token = getAccessToken();
      if (!token) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${window.location.host}/ws/notifications/?token=${token}`);

      ws.onmessage = (event) => {
        let msg: { type?: string; count?: number; title?: string; action_url?: string };
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "unread_count" && typeof msg.count === "number") {
          qc.setQueryData(["notifications", "unread"], msg.count);
        } else if (msg.type === "notification") {
          qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
          qc.invalidateQueries({ queryKey: ["notifications"] });
          if (msg.title) toast.info(msg.title);
        }
      };

      ws.onopen = () => { retry.current = 0; };

      ws.onclose = () => {
        if (closed.current) return;
        // Exponential backoff capped at 30s.
        const delay = Math.min(1000 * 2 ** retry.current, 30_000);
        retry.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      closed.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, qc]);
}
