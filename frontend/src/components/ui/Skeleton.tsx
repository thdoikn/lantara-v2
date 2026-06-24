import { cn } from "@/lib/cn";

/** Pulse placeholder for loading states. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-khatulistiwa-100", className)} aria-hidden="true" />;
}
