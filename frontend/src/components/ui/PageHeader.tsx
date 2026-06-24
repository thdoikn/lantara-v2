import type { ReactNode } from "react";

/**
 * Standard page header for authenticated portals: optional eyebrow, title,
 * description, and a right-aligned actions slot. Replaces the bespoke h1 blocks
 * each page hand-rolled, so spacing/hierarchy are consistent everywhere.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 flex-wrap mb-8 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-terakota-600 text-xs font-bold tracking-[0.16em] uppercase mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-khatulistiwa-900 font-display font-black text-2xl md:text-[1.75rem] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-khatulistiwa-500/80 text-sm mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
