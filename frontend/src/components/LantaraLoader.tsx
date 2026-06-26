import { motion, useReducedMotion } from "framer-motion";
import BatangBanyu from "@/components/BatangBanyu";

/**
 * LantaraLoader — the branded "Nusantara Royal" loading screen.
 *
 * Replaces the plain border-spin circle for page transitions (Suspense
 * fallback / auth rehydration) and full-page data loads. The IKN logo
 * "breathes" over a royal-blue glow while the Batang Banyu river motif drifts
 * beneath it, so a loading moment reads as Lantara rather than a generic
 * spinner.
 *
 * - variant="page"   → full-screen, light surface (authenticated calm register)
 * - variant="inline" → fills its parent (transparent); pass `dark` on the
 *                      immersive dark public surfaces so the label stays legible.
 */

// Easing token from globals.css (--ease-out-quint).
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

export interface LantaraLoaderProps {
  variant?: "page" | "inline";
  /** Render for a dark background surface (light label text). */
  dark?: boolean;
  /** Loading label; defaults to Bahasa Indonesia "Memuat…". */
  label?: string;
}

export default function LantaraLoader({
  variant = "page",
  dark = false,
  label = "Memuat…",
}: LantaraLoaderProps) {
  const reduceMotion = useReducedMotion();

  const wrapperClass =
    variant === "page"
      ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-surface"
      : "flex w-full flex-col items-center justify-center gap-6 py-24";

  return (
    <div
      className={wrapperClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Logo + royal glow halo */}
      <div className="relative flex items-center justify-center">
        <span
          className="absolute h-24 w-24 rounded-full bg-khatulistiwa-500/20 blur-2xl"
          aria-hidden="true"
        />
        <motion.img
          src="/ikn-logo.png"
          alt=""
          aria-hidden="true"
          className="relative h-16 w-16 rounded-2xl object-contain shadow-glow-royal"
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }
          }
          transition={{
            duration: 1.6,
            ease: EASE_OUT_QUINT,
            repeat: Infinity,
          }}
        />
      </div>

      {/* Flowing Batang Banyu river beneath the logo */}
      <div
        className="relative h-7 w-48 overflow-hidden text-terakota-400"
        aria-hidden="true"
      >
        <motion.div
          className="absolute inset-y-0 left-0 w-96"
          animate={reduceMotion ? undefined : { x: [0, -120] }}
          transition={{ duration: 3, ease: "linear", repeat: Infinity }}
        >
          <BatangBanyu variant="strip" height={28} opacity={0.9} />
        </motion.div>
      </div>

      <p
        className={
          "font-display text-sm font-medium tracking-wide " +
          (dark ? "text-khatulistiwa-100/80" : "text-ink-muted")
        }
      >
        {label}
      </p>
    </div>
  );
}
