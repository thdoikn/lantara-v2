import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Send } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";

const schema = z.object({ email: z.string().email("Format email tidak valid") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/auth/password/reset/", data),
    onSuccess: (_, vars) =>
      navigate("/auth/verify-otp", { state: { email: vars.email, purpose: "password_reset" } }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="card shadow-floating overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-jagawana via-khatulistiwa to-jagawana" />

          <div className="p-8 space-y-7">
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-jagawana/10 flex items-center justify-center">
                <KeyRound className="h-7 w-7 text-jagawana" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Lupa Password?</h1>
                <p className="mt-2 text-sm text-buana leading-relaxed">
                  Masukkan email terdaftar Anda. Kami akan mengirimkan kode verifikasi.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
              <div className="field-group">
                <label className="form-label">Alamat Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="email@contoh.com"
                  {...register("email")}
                  className={cn("input", errors.email && "input-error")}
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              {mutation.isSuccess && (
                <div className="rounded-xl bg-emerald-50 ring-1 ring-jagawana/25 px-4 py-3 text-sm text-jagawana-deep">
                  ✓ Jika email terdaftar, kode reset telah dikirim. Cek kotak masuk Anda.
                </div>
              )}

              {mutation.isError && (
                <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">
                  Terjadi kesalahan. Silakan coba lagi.
                </div>
              )}

              <button
                type="submit"
                disabled={mutation.isPending || mutation.isSuccess}
                className="btn-primary w-full py-3"
              >
                {mutation.isPending ? "Mengirim…" : (
                  <><Send className="h-4 w-4" aria-hidden="true" /><span>Kirim Kode Reset</span></>
                )}
              </button>
            </form>

            <div className="text-center">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm text-buana hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Kembali ke halaman masuk
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
