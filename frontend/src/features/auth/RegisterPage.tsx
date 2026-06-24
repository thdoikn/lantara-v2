import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Leaf, Building2 } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { buildAuthorizationUrl, isSsoEnabled } from "@/lib/oidc";
import { cn } from "@/lib/cn";

const schema = z
  .object({
    email: z.string().email("Format email tidak valid"),
    full_name: z.string().min(3, "Nama minimal 3 karakter"),
    phone: z.string().min(10, "Nomor telepon tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Password tidak cocok",
    path: ["password_confirm"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/auth/register/", data),
    onSuccess: (_, vars) =>
      navigate("/auth/verify-otp", { state: { email: vars.email, purpose: "email_verify" } }),
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data?.errors) {
        Object.entries(data.errors as Record<string, string[]>).forEach(([field, msgs]) => {
          setError(field as keyof FormData, { message: msgs[0] });
        });
      } else {
        setError("root", { message: (data?.detail as string) || "Pendaftaran gagal. Coba lagi." });
      }
    },
  });

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: visual ── */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-12 bg-gradient-auth">
        <div className="absolute top-[-100px] right-[-100px] h-[500px] w-[500px] rounded-full
                        bg-jagawana/15 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[60px] left-[-80px] h-[300px] w-[300px] rounded-full
                        bg-terakota/10 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 dot-grid opacity-[0.06] text-white pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-jagawana flex items-center justify-center shadow-glow-green">
            <Leaf className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-xl text-white">Lantara</span>
        </div>

        <div className="relative z-10 space-y-5">
          <h1 className="font-display text-[2.4rem] font-extrabold text-white leading-[1.15]">
            Bergabung dengan<br />
            <span className="bg-gradient-to-r from-jagawana-light to-terakota bg-clip-text text-transparent">
              Nusantara Digital.
            </span>
          </h1>
          <p className="text-white/55 text-base leading-relaxed max-w-xs">
            Daftar gratis dan mulai ajukan izin usaha Anda di Ibu Kota Nusantara secara digital.
          </p>

          {/* Feature checklist */}
          <ul className="space-y-3">
            {[
              "Proses 100% online, tanpa antri",
              "Pantau status permohonan real-time",
              "Notifikasi via email & WhatsApp",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jagawana/30 text-jagawana-light text-xs font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-white/25 text-xs">© 2025 Otorita IKN</p>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px] space-y-7"
        >
          <div className="flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 rounded-xl bg-jagawana flex items-center justify-center">
              <Leaf className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-lg text-jagawana">Lantara</span>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold text-foreground tracking-tight">Buat Akun</h2>
            <p className="mt-2 text-buana text-sm">
              Sudah punya akun?{" "}
              <Link to="/auth/login" className="text-khatulistiwa font-semibold hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>

          {/* OIKN staff don't need to register — point them to SSO instead. */}
          {isSsoEnabled() && (
            <div className="flex items-start gap-3 rounded-xl border border-jagawana/25 bg-jagawana/[0.06] px-4 py-3.5">
              <Building2 className="h-4 w-4 text-jagawana shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Pegawai Otorita IKN?</p>
                <p className="text-buana mt-0.5">
                  Tidak perlu mendaftar — gunakan akun SSO OIKN Anda.{" "}
                  <button
                    type="button"
                    onClick={() => { window.location.href = buildAuthorizationUrl(); }}
                    className="text-jagawana font-semibold hover:underline"
                  >
                    Masuk dengan SSO →
                  </button>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            {[
              { name: "full_name" as const, label: "Nama Lengkap", type: "text", placeholder: "Sesuai KTP", autoComplete: "name" },
              { name: "email" as const, label: "Email", type: "email", placeholder: "email@contoh.com", autoComplete: "email" },
              { name: "phone" as const, label: "No. Telepon / WhatsApp", type: "tel", placeholder: "0812-xxxx-xxxx", autoComplete: "tel" },
            ].map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name} className="field-group">
                <label className="form-label">{label}</label>
                <input
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  {...register(name)}
                  className={cn("input", errors[name] && "input-error")}
                />
                {errors[name] && <p className="form-error">{errors[name]?.message}</p>}
              </div>
            ))}

            <div className="field-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  {...register("password")}
                  className={cn("input pr-11", errors.password && "input-error")}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Sembunyikan" : "Tampilkan"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-buana hover:text-foreground transition-colors">
                  {showPass
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <div className="field-group">
              <label className="form-label">Konfirmasi Password</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Ulangi password"
                {...register("password_confirm")}
                className={cn("input", errors.password_confirm && "input-error")}
              />
              {errors.password_confirm && <p className="form-error">{errors.password_confirm.message}</p>}
            </div>

            {errors.root && (
              <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-3">
              {mutation.isPending ? "Mendaftar…" : (
                <><span>Buat Akun</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-buana">
            Dengan mendaftar, Anda menyetujui{" "}
            <Link to="/" className="text-khatulistiwa hover:underline">Ketentuan Layanan</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
