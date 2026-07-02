import type { Ticket } from "./api";
import {
  STATUS_META,
  TONE_CLASSES,
  stepsFor,
  currentStepIndex,
  type Tone,
} from "./queueStatus";
import { Check } from "lucide-react";

/** Icon + label pill for a ticket status. `urgent` states gently pulse. */
export function StatusBadge({ status, size = "md" }: { status: Ticket["status"]; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const tone = TONE_CLASSES[meta.tone];
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${tone.badge} ${pad} ${
        meta.urgent ? "animate-pulse motion-reduce:animate-none" : ""
      }`}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/**
 * Horizontal journey stepper: Ambil → (Check-in) → Menunggu → Dipanggil → Selesai.
 * Completed steps fill in; the current step is ringed and colored by status tone.
 */
export function QueueStepper({ ticket }: { ticket: Ticket }) {
  const steps = stepsFor(ticket);
  const current = currentStepIndex(ticket);
  const tone: Tone = STATUS_META[ticket.status].tone;
  const active = TONE_CLASSES[tone];

  return (
    <ol className="flex items-center">
      {steps.map((step, i) => {
        const done = i < current;
        const isActive = i === current;
        const Icon = step.icon;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full ring-2 transition-colors",
                  done
                    ? "bg-khatulistiwa-600 text-white ring-khatulistiwa-600"
                    : isActive
                      ? `${active.solid} text-white ring-4 ${active.ring}`
                      : "bg-white text-khatulistiwa-400 ring-pertiwi-muted",
                ].join(" ")}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-[10px] font-medium sm:text-xs ${
                  isActive ? "text-khatulistiwa-900" : "text-khatulistiwa-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded-full sm:mx-2 ${
                  i < current ? "bg-khatulistiwa-600" : "bg-pertiwi-muted"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Small labelled stat used across ticket + kiosk. */
export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white px-4 py-4">
      <p className="text-xs text-khatulistiwa-400">{label}</p>
      <p className={`mt-1 font-semibold ${accent ? "text-khatulistiwa-700" : "text-khatulistiwa-900"}`}>
        {value}
      </p>
    </div>
  );
}
