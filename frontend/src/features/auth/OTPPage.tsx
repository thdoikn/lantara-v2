import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Leaf, RotateCcw, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";

export default function OTPPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email: string = state?.email ?? "";
  const purpose: string = state?.purpose ?? "email_verify";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const verifyMutation = useMutation({
    mutationFn: () => api.post("/auth/otp/verify/", { email, code: digits.join(""), purpose }),
    onSuccess: () => {
      setError("");
      setSuccess(true);
      // brief success flourish before routing onward
      setTimeout(() => {
        if (purpose === "email_verify") navigate("/auth/login", { state: { verified: true } });
        else navigate("/auth/login");
      }, 850);
    },
    onError: () => {
      setError("Kode OTP tidak valid atau sudah kadaluarsa.");
      setShake(true);
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => api.post("/auth/otp/resend/", { email, purpose }),
    onSuccess: () => {
      setResendCooldown(60);
      setError("");
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
    },
  });

  const handleDigit = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      setTimeout(() => verifyMutation.mutate(), 80);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      setTimeout(() => verifyMutation.mutate(), 80);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const filled = digits.filter(Boolean).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="card shadow-floating overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-jagawana via-khatulistiwa to-jagawana" />

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-10 flex flex-col items-center text-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="h-16 w-16 rounded-full bg-jagawana/10 flex items-center justify-center text-jagawana"
                >
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor"
                    strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4 4L19 7" className="animate-draw" style={{ ["--len" as string]: "24" }} />
                  </svg>
                </motion.div>
                <div>
                  <h1 className="font-display text-xl font-bold">Terverifikasi</h1>
                  <p className="mt-1 text-sm text-buana">Mengalihkan Anda…</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 space-y-7">
                {/* Header */}
                <div className="space-y-4 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-khatulistiwa/10 flex items-center justify-center">
                    <Mail className="h-7 w-7 text-khatulistiwa" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold">Verifikasi OTP</h1>
                    <p className="mt-2 text-sm text-buana leading-relaxed">
                      Kode 6 digit telah dikirim ke<br />
                      <span className="font-semibold text-foreground">{email}</span>
                    </p>
                  </div>
                </div>

                {/* OTP inputs */}
                <div
                  onPaste={handlePaste}
                  onAnimationEnd={() => setShake(false)}
                  className={cn("flex gap-2 justify-center", shake && "animate-shake")}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { refs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      aria-label={`Digit ${i + 1}`}
                      onChange={(e) => handleDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={cn(
                        "h-14 w-12 rounded-xl text-center text-xl font-bold transition-all duration-150",
                        "ring-1 ring-black/[0.10] bg-white focus:outline-none",
                        d
                          ? "ring-khatulistiwa/60 ring-2 text-khatulistiwa animate-otp-pop"
                          : "focus:ring-2 focus:ring-khatulistiwa/40"
                      )}
                    />
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="flex gap-1 justify-center">
                  {digits.map((_, i) => (
                    <div key={i} className={cn(
                      "h-1 rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      i < filled ? "w-8 bg-khatulistiwa" : "w-4 bg-border"
                    )} />
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-2.5 text-sm text-red-700 text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => verifyMutation.mutate()}
                  disabled={digits.some((d) => !d) || verifyMutation.isPending}
                  className="btn-primary w-full py-3"
                >
                  {verifyMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memverifikasi…</>
                    : "Verifikasi Kode"}
                </button>

                {/* Resend */}
                <div className="text-center text-sm text-buana">
                  Tidak menerima kode?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-buana tabular-nums">
                      Kirim ulang dalam <strong className="text-foreground">{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      onClick={() => resendMutation.mutate()}
                      disabled={resendMutation.isPending}
                      className="inline-flex items-center gap-1 text-khatulistiwa font-semibold hover:underline"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Kirim Ulang
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back link */}
        <div className="mt-5 text-center">
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-buana hover:text-foreground transition-colors">
            <Leaf className="h-3.5 w-3.5 text-jagawana" aria-hidden="true" />
            Lantara
          </button>
        </div>
      </motion.div>
    </div>
  );
}
