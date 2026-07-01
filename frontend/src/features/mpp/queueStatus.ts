import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Users,
  BellRing,
  Loader,
  CheckCircle2,
  XCircle,
  CircleSlash,
  Ticket as TicketIcon,
} from "lucide-react";
import type { Ticket, TicketStatus } from "./api";

export type Tone = "amber" | "royal" | "emerald" | "slate" | "danger";

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  /** One-line guidance shown to the citizen for this state. */
  hint: string;
  /** Whether this state wants the citizen to act now (drives emphasis/animation). */
  urgent?: boolean;
}

export const STATUS_META: Record<TicketStatus, StatusMeta> = {
  reserved: {
    label: "Belum Check-in",
    tone: "amber",
    icon: Clock,
    hint: "Nomor Anda dipesan. Lakukan check-in saat tiba di MPP agar masuk antrean.",
    urgent: true,
  },
  checked_in: {
    label: "Sudah Check-in",
    tone: "royal",
    icon: Users,
    hint: "Anda telah check-in dan masuk kolam panggil.",
  },
  in_pool: {
    label: "Dalam Antrean",
    tone: "royal",
    icon: Users,
    hint: "Anda dalam antrean. Mohon tunggu di area tunggu.",
  },
  called: {
    label: "Sedang Dipanggil",
    tone: "emerald",
    icon: BellRing,
    hint: "Giliran Anda! Segera menuju loket.",
    urgent: true,
  },
  serving: {
    label: "Sedang Dilayani",
    tone: "royal",
    icon: Loader,
    hint: "Anda sedang dilayani di loket.",
  },
  served: {
    label: "Selesai",
    tone: "emerald",
    icon: CheckCircle2,
    hint: "Layanan selesai. Terima kasih atas kunjungan Anda.",
  },
  no_show: {
    label: "Tidak Hadir",
    tone: "danger",
    icon: XCircle,
    hint: "Nomor hangus karena tidak hadir. Anda bebas mengambil nomor baru.",
  },
  expired: {
    label: "Kedaluwarsa",
    tone: "slate",
    icon: CircleSlash,
    hint: "Nomor kedaluwarsa. Silakan ambil nomor baru bila masih diperlukan.",
  },
  cancelled: {
    label: "Dibatalkan",
    tone: "slate",
    icon: CircleSlash,
    hint: "Nomor telah dibatalkan.",
  },
};

/** Tailwind class bundles per tone — text/bg/border/ring for badges + accents. */
export const TONE_CLASSES: Record<Tone, { text: string; bg: string; badge: string; ring: string }> = {
  amber: {
    text: "text-gold-500",
    bg: "bg-gold-500",
    badge: "bg-gold-500/15 text-gold-500",
    ring: "ring-gold-500/30",
  },
  royal: {
    text: "text-royal-600",
    bg: "bg-royal-600",
    badge: "bg-royal-100 text-royal-700",
    ring: "ring-royal-500/30",
  },
  emerald: {
    text: "text-status-success",
    bg: "bg-status-success",
    badge: "bg-status-success/15 text-status-success",
    ring: "ring-status-success/30",
  },
  slate: {
    text: "text-ink-faint",
    bg: "bg-ink-faint",
    badge: "bg-ink-faint/15 text-ink-muted",
    ring: "ring-ink-faint/20",
  },
  danger: {
    text: "text-status-danger",
    bg: "bg-status-danger",
    badge: "bg-status-danger/10 text-status-danger",
    ring: "ring-status-danger/30",
  },
};

export const ACTIVE_STATUSES: TicketStatus[] = [
  "reserved",
  "checked_in",
  "in_pool",
  "called",
  "serving",
];

export const TERMINAL_STATUSES: TicketStatus[] = ["served", "no_show", "expired", "cancelled"];

export interface Step {
  key: string;
  label: string;
  icon: LucideIcon;
}

/** Journey steps — walk-in skips the explicit check-in gate (auto on issue). */
export function stepsFor(ticket: Ticket): Step[] {
  const base: Step[] = [
    { key: "take", label: "Ambil Nomor", icon: TicketIcon },
    { key: "checkin", label: "Check-in", icon: Clock },
    { key: "waiting", label: "Menunggu", icon: Users },
    { key: "called", label: "Dipanggil", icon: BellRing },
    { key: "done", label: "Selesai", icon: CheckCircle2 },
  ];
  if (ticket.channel === "walkin") return base.filter((s) => s.key !== "checkin");
  return base;
}

/** Index of the current step for a ticket (0-based over stepsFor()). */
export function currentStepIndex(ticket: Ticket): number {
  const steps = stepsFor(ticket);
  const idx = (key: string) => steps.findIndex((s) => s.key === key);
  switch (ticket.status) {
    case "reserved":
      return idx("checkin");
    case "checked_in":
    case "in_pool":
      return idx("waiting");
    case "called":
      return idx("called");
    case "serving":
      return idx("done");
    case "served":
      return steps.length; // all complete
    default:
      return -1; // terminal off-ramp (no_show/expired/cancelled)
  }
}

export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { detail?: string } } };
  return ax.response?.data?.detail ?? "Terjadi kesalahan.";
}
