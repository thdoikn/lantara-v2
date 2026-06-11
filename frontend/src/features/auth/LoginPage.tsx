import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Leaf } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { setTokens, useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});
type FormData = z.infer<typeof schema>;

const STATS = [
  { value: "31+", label: "Jenis Izin" },
  { value: "3–8", label: "Hari Kerja" },
  { value: "100%", label: "Digital" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/auth/token/", data),
    onSuccess: (res) => {
      setTokens(res.data.access, res.data.refresh);
      setUser(res.data.user);
      const roles: string[] = res.data.user.roles ?? [];
      if (roles.includes("superadmin") || res.data.user.is_staff) navigate("/admin");
      else if (roles.some((r: string) => r.includes(":"))) navigate("/verifier");
      else navigate("/portal");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError("root", { message: msg || "Email atau password salah." });
    },
  });

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: atmospheric brand ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12
                      bg-gradient-auth">
        {/* Radial glow accents */}
        <div className="absolute top-[-80px] left-[-80px] h-[420px] w-[420px] rounded-full
                        bg-jagawana/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] h-[300px] w-[300px] rounded-full
                        bg-khatulistiwa/15 blur-[100px] pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-[0.07] text-white pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-jagawana flex items-center justify-center shadow-glow-green">
            <Leaf className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-xl text-white tracking-tight">Lantara</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            <p className="text-jagawana/80 text-xs font-bold uppercase tracking-[0.15em]">
              Otorita Ibu Kota Nusantara
            </p>
            <h1 className="font-display text-[2.6rem] font-extrabold text-white leading-[1.15]">
              Izin Usahamu,<br />
              <span className="text-gradient bg-gradient-to-r from-jagawana-light to-terakota bg-clip-text text-transparent">
                Lebih Mudah.
              </span>
            </h1>
            <p className="text-white/55 text-base leading-relaxed max-w-xs">
              Platform perizinan resmi IKN — proses digital, transparan, dan efisien dari hutan ke kota.
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex gap-3 flex-wrap">
            {STATS.map(({ value, label }) => (
              <div key={label}
                className="rounded-xl bg-white/8 ring-1 ring-white/12 px-4 py-2.5 backdrop-blur-sm">
                <div className="font-display text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-white/50 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/25 text-xs">
          © 2025 Otorita IKN · Semua hak dilindungi
        </p>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 rounded-xl bg-jagawana flex items-center justify-center">
              <Leaf className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-lg text-jagawana">Lantara</span>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold text-foreground tracking-tight">
              Selamat datang
            </h2>
            <p className="mt-2 text-buana text-sm">
              Belum punya akun?{" "}
              <Link to="/auth/register"
                className="text-khatulistiwa font-semibold hover:text-khatulistiwa-light transition-colors">
                Daftar gratis
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            <div className="field-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                placeholder="email@contoh.com"
                className={cn("input", errors.email && "input-error")}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="field-group">
              <div className="flex justify-between items-center mb-1.5">
                <label className="form-label mb-0">Password</label>
                <Link to="/auth/forgot-password"
                  className="text-xs text-khatulistiwa hover:underline">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="••••••••"
                  className={cn("input pr-11", errors.password && "input-error")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-buana hover:text-foreground transition-colors"
                >
                  {showPass
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-3">
              {mutation.isPending ? "Memproses…" : (
                <><span>Masuk</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-buana">
            Dengan masuk, Anda menyetujui{" "}
            <Link to="/" className="text-khatulistiwa hover:underline">Ketentuan Layanan</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
