import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";
import { useToastStore, type Toast, type ToastKind } from "@/lib/toast";

const KIND_META: Record<ToastKind, { Icon: typeof CheckCircle2; accent: string; iconColor: string }> = {
  success: { Icon: CheckCircle2, accent: "border-l-emerald-500", iconColor: "text-emerald-500" },
  error:   { Icon: XCircle,      accent: "border-l-red-500",     iconColor: "text-red-500" },
  warning: { Icon: AlertTriangle, accent: "border-l-amber-500",  iconColor: "text-amber-500" },
  info:    { Icon: Info,         accent: "border-l-khatulistiwa-500", iconColor: "text-khatulistiwa-500" },
};

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { Icon, accent, iconColor } = KIND_META[t.kind];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      className={`pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] bg-white
                  rounded-xl border border-pertiwi-muted border-l-4 ${accent} shadow-floating px-4 py-3`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
      <p className="flex-1 text-sm text-khatulistiwa-900 leading-snug">{t.message}</p>
      <button
        onClick={() => dismiss(t.id)}
        className="text-khatulistiwa-400 hover:text-khatulistiwa-700 transition-colors shrink-0"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2.5 items-end pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
