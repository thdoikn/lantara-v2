import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Consistent empty state — icon tile, heading, supporting copy, optional action.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      <div className="mx-auto h-14 w-14 rounded-2xl bg-khatulistiwa-100 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-khatulistiwa-500" aria-hidden="true" />
      </div>
      <h3 className="text-khatulistiwa-900 font-display font-bold text-lg">{title}</h3>
      {description && (
        <p className="text-khatulistiwa-500/70 text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
