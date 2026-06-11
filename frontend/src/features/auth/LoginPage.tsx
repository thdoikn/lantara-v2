import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { setTokens, useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/auth/token/", data),
    onSuccess: (res) => {
      setTokens(res.data.access, res.data.refresh);
      setUser(res.data.user);
      // Redirect based on role
      const roles: string[] = res.data.user.roles ?? [];
      if (roles.includes("superadmin") || res.data.user.is_staff) {
        navigate("/admin");
      } else if (roles.some((r: string) => r.includes(":"))) {
        navigate("/verifier");
      } else {
        navigate("/portal");
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError("root", { message: msg || "Email atau password salah." });
    },
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-buana-dark p-12">
        <div>
          <span className="text-jagawana font-display font-bold text-2xl">Lantara</span>
        </div>
        <div className="text-white space-y-4">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Layanan Nusantara
          </h1>
          <p className="text-white/60 text-lg">
            Portal perizinan resmi Ibu Kota Nusantara — proses pengajuan izin
            secara digital, transparan, dan efisien.
          </p>
        </div>
        <p className="text-white/30 text-sm">© 2025 Otorita IKN</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Masuk ke Akun
            </h2>
            <p className="mt-2 text-buana">
              Belum punya akun?{" "}
              <Link to="/auth/register" className="text-khatulistiwa font-medium hover:underline">
                Daftar di sini
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                className={cn(
                  "w-full rounded-lg border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-khatulistiwa",
                  errors.email ? "border-saka" : "border-border"
                )}
                placeholder="email@contoh.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-saka">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-khatulistiwa hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className={cn(
                  "w-full rounded-lg border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-khatulistiwa",
                  errors.password ? "border-saka" : "border-border"
                )}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-saka">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="rounded-lg bg-saka/10 border border-saka/30 px-4 py-3 text-sm text-red-800">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-lg bg-jagawana py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Memproses…" : "Masuk"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
