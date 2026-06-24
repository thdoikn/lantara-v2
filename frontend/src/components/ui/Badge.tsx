import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Status badge — icon + text, never colour-only (CLAUDE.md §4.5). One source of
 * truth so the two ad-hoc badge styles scattered across portals converge.
 */
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-khatulistiwa-50 text-khatulistiwa-700 border-khatulistiwa-100",
  info:    "bg-khatulistiwa-50 text-khatulistiwa-700 border-khatulistiwa-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger:  "bg-red-50 text-red-700 border-red-200",
  gold:    "bg-terakota-50 text-terakota-700 border-terakota-200",
};

export default function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}
