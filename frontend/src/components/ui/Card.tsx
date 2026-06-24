import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Base surface card for authenticated portals. */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag className={cn("bg-white rounded-2xl border border-pertiwi-muted shadow-sm", className)}>
      {children}
    </Tag>
  );
}

export type StatTone = "navy" | "info" | "success" | "warning" | "danger" | "gold";

const STAT_TONES: Record<StatTone, { wrap: string; iconWrap: string; icon: string; value: string; label: string }> = {
  navy:    { wrap: "bg-gradient-jagawana text-white border-transparent", iconWrap: "bg-white/15", icon: "text-white", value: "text-white", label: "text-white/70" },
  info:    { wrap: "bg-white border-pertiwi-muted", iconWrap: "bg-khatulistiwa-50", icon: "text-khatulistiwa-600", value: "text-khatulistiwa-900", label: "text-khatulistiwa-500/80" },
  success: { wrap: "bg-white border-pertiwi-muted", iconWrap: "bg-emerald-50", icon: "text-emerald-600", value: "text-khatulistiwa-900", label: "text-khatulistiwa-500/80" },
  warning: { wrap: "bg-white border-pertiwi-muted", iconWrap: "bg-amber-50", icon: "text-amber-600", value: "text-khatulistiwa-900", label: "text-khatulistiwa-500/80" },
  danger:  { wrap: "bg-white border-pertiwi-muted", iconWrap: "bg-red-50", icon: "text-red-600", value: "text-khatulistiwa-900", label: "text-khatulistiwa-500/80" },
  gold:    { wrap: "bg-white border-pertiwi-muted", iconWrap: "bg-terakota-50", icon: "text-terakota-600", value: "text-khatulistiwa-900", label: "text-khatulistiwa-500/80" },
};

/** Stat card — consistent metric tile across dashboards. */
export function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  tone = "info",
  className = "",
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  sub?: string;
  tone?: StatTone;
  className?: string;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className={cn("rounded-2xl border p-5 flex flex-col gap-3 min-h-[124px]", t.wrap, className)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.iconWrap)}>
        <Icon className={cn("w-5 h-5", t.icon)} aria-hidden="true" />
      </div>
      <div className="mt-auto">
        <p className={cn("font-display font-black text-3xl leading-none", t.value)}>{value}</p>
        <p className={cn("text-sm font-semibold mt-1.5", t.label)}>{label}</p>
        {sub && <p className={cn("text-xs mt-0.5", t.label)}>{sub}</p>}
      </div>
    </div>
  );
}
