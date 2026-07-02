import { useEffect, useState } from "react";

export interface Countdown {
  totalMs: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  /** Human label, e.g. "12 menit", "45 detik", or "sebentar lagi". */
  label: string;
}

/** Live countdown to an ISO timestamp, ticking every second. */
export function useCountdown(targetIso: string | null | undefined): Countdown | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  const totalMs = target - now;
  const isPast = totalMs <= 0;
  const abs = Math.abs(totalMs);
  const minutes = Math.floor(abs / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);

  let label: string;
  if (isPast) label = "sebentar lagi";
  else if (minutes >= 1) label = `${minutes} menit`;
  else label = `${seconds} detik`;

  return { totalMs, minutes, seconds, isPast, label };
}
