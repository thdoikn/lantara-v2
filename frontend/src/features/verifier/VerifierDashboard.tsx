import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Inbox, Clock, Flame, PenLine, CheckCircle2, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth";
import type { VerifierStats } from "@/types";

const greeting = () => {
  const h = new Date().getHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
};

type Card = {
  key: keyof VerifierStats;
  label: string;
  icon: LucideIcon;
  to: string;
  tone: { bg: string; border: string; icon: string };
};

const NEUTRAL = { bg: "bg-white", border: "border-khatulistiwa-100", icon: "text-khatulistiwa-400" };
const CARDS: Card[] = [
  { key: "queued", label: "Dalam Antrean", icon: Inbox, to: "/verifier/queue", tone: NEUTRAL },
  { key: "at_risk", label: "Mendekati SLA", icon: Clock, to: "/verifier/queue?sla=at_risk",
    tone: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500" } },
  { key: "breached", label: "SLA Terlampaui", icon: Flame, to: "/verifier/queue?sla=breached",
    tone: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500" } },
  { key: "in_revision", label: "Menunggu Revisi", icon: PenLine, to: "/verifier/queue?tab=2",
    tone: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500" } },
];

export default function VerifierDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery<VerifierStats>({
    queryKey: ["verifier-stats"],
    queryFn: () => api.get("/submissions/verifier-stats/").then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #064E3B 0%, #065F46 55%, #047857 100%)" }}
      >
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-emerald-100/70 text-sm mb-1">{greeting()},</p>
            <h1 className="text-white font-display font-black text-3xl">
              {user?.full_name?.split(" ")[0] ?? "Verifikator"} 🛡️
            </h1>
            <p className="text-emerald-100/70 text-sm mt-2">
              {isLoading
                ? "Memuat ringkasan antrean…"
                : `${data?.processed_today ?? 0} permohonan Anda proses hari ini.`}
            </p>
          </div>
          <Link
            to="/verifier/queue"
            className="shrink-0 inline-flex items-center gap-2 bg-white/95 hover:bg-white text-emerald-800 font-display font-bold px-6 py-3 rounded-xl transition-colors shadow-lg"
          >
            Buka Antrean <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </motion.div>

      {/* Queue health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          const value = data?.[c.key] ?? 0;
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link
                to={c.to}
                className={cn(
                  "block rounded-2xl border p-5 min-h-[130px] flex flex-col justify-between transition-all hover:shadow-md",
                  c.tone.bg, c.tone.border,
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center", c.tone.icon)}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display font-black text-3xl tabular-nums text-khatulistiwa-900">
                    {isLoading ? <span className="inline-block w-8 h-7 rounded bg-khatulistiwa-100 animate-pulse" /> : value}
                  </p>
                  <p className="text-sm text-khatulistiwa-600/70 mt-1">{c.label}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Today */}
      <div className="rounded-2xl border border-khatulistiwa-100 bg-white p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-khatulistiwa-900 font-semibold text-sm">
            Diproses hari ini: {data?.processed_today ?? 0}
          </p>
          <p className="text-khatulistiwa-500/70 text-xs mt-0.5">
            Tindakan verifikasi yang Anda selesaikan hari ini.
          </p>
        </div>
        <Link
          to="/verifier/queue"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Lanjut memproses <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
