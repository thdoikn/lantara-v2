import { cn } from "@/lib/cn";

const ROLE: Record<string, { label: string; cls: string }> = {
  applicant: { label: "Pemohon", cls: "text-khatulistiwa-700 bg-khatulistiwa-50" },
  staff: { label: "Verifikator", cls: "text-emerald-700 bg-emerald-50" },
  system: { label: "Sistem", cls: "text-slate-600 bg-slate-100" },
};

/** Who performed an audited action — applicant, staff verifier, or the system. */
export default function ActorRoleBadge({ role }: { role?: string | null }) {
  const cfg = ROLE[role ?? ""] ?? ROLE.system;
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
