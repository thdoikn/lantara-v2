import { useEffect, useRef } from "react";
import { getAccessToken } from "@/lib/auth";

/**
 * Live queue updates over WebSocket, mirroring useNotificationSocket's backoff
 * pattern. Two channels:
 *   - ticket: /ws/antrean/ticket/<id>/?token=<jwt>  (authenticated citizen)
 *   - board:  /ws/antrean/board/<instansiKey>/      (public lobby screen)
 * `onMessage` fires for every payload; callers refetch or merge as needed.
 */
function useSocket(path: string | null, onMessage: (data: unknown) => void, withToken: boolean) {
  const cb = useRef(onMessage);
  cb.current = onMessage;

  useEffect(() => {
    if (!path) return;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retry = 0;
    let closed = false;

    function connect() {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      let url = `${proto}://${window.location.host}${path}`;
      if (withToken) {
        const token = getAccessToken();
        if (!token) return;
        url += `?token=${token}`;
      }
      ws = new WebSocket(url);
      ws.onmessage = (e) => {
        try {
          cb.current(JSON.parse(e.data));
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onopen = () => {
        retry = 0;
      };
      ws.onclose = () => {
        if (closed) return;
        const delay = Math.min(1000 * 2 ** retry, 30_000);
        retry += 1;
        timer = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [path, withToken]);
}

export function useTicketSocket(ticketId: string | null, onMessage: (data: unknown) => void) {
  useSocket(ticketId ? `/ws/antrean/ticket/${ticketId}/` : null, onMessage, true);
}

export function useBoardSocket(instansiKey: string | null, onMessage: (data: unknown) => void) {
  useSocket(instansiKey ? `/ws/antrean/board/${instansiKey}/` : null, onMessage, false);
}
