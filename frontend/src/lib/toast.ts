import { create } from "zustand";

/**
 * Global toast store + helper. Call `toast.success("…")` from anywhere
 * (event handlers, mutation callbacks). Render <Toaster /> once at the app root.
 */

export type ToastKind = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function show(kind: ToastKind, message: string, duration = 4000) {
  useToastStore.getState().push({ kind, message, duration });
}

export const toast = {
  success: (m: string, d?: number) => show("success", m, d),
  error: (m: string, d?: number) => show("error", m, d ?? 6000),
  info: (m: string, d?: number) => show("info", m, d),
  warning: (m: string, d?: number) => show("warning", m, d),
};
