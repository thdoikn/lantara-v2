import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";

export default function OTPPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email: string = state?.email ?? "";
  const purpose: string = state?.purpose ?? "email_verify";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const verifyMutation = useMutation({
    mutationFn: () =>
      api.post("/auth/otp/verify/", {
        email,
        code: digits.join(""),
        purpose,
      }),
    onSuccess: () => {
      if (purpose === "email_verify") navigate("/auth/login", { state: { verified: true } });
      else navigate("/auth/login");
    },
    onError: () => setError("Kode OTP tidak valid atau sudah kadaluarsa."),
  });

  const resendMutation = useMutation({
    mutationFn: () => api.post("/auth/otp/resend/", { email, purpose }),
    onSuccess: () => setResendCooldown(60),
  });

  const handleDigit = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      // auto-submit when all 6 digits filled
      setTimeout(() => verifyMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="space-y-2">
          <div className="text-4xl">📬</div>
          <h1 className="font-display text-2xl font-bold">Masukkan Kode OTP</h1>
          <p className="text-buana text-sm">
            Kode 6 digit telah dikirim ke{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="flex gap-2 justify-center">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-border bg-white focus:outline-none focus:border-khatulistiwa transition-colors"
            />
          ))}
        </div>

        {error && <p className="text-saka text-sm">{error}</p>}

        <button
          onClick={() => verifyMutation.mutate()}
          disabled={digits.some((d) => !d) || verifyMutation.isPending}
          className="w-full rounded-lg bg-jagawana py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors disabled:opacity-60"
        >
          {verifyMutation.isPending ? "Memverifikasi…" : "Verifikasi"}
        </button>

        <p className="text-sm text-buana">
          Tidak menerima kode?{" "}
          {resendCooldown > 0 ? (
            <span className="text-buana">Kirim ulang dalam {resendCooldown}s</span>
          ) : (
            <button
              onClick={() => resendMutation.mutate()}
              className="text-khatulistiwa font-medium hover:underline"
            >
              Kirim Ulang
            </button>
          )}
        </p>
      </motion.div>
    </div>
  );
}
