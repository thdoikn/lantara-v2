import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/auth/register/", data),
    onSuccess: (_, vars) => {
      navigate("/auth/verify-otp", { state: { email: vars.email, purpose: "email_verify" } });
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data?.errors) {
        Object.entries(data.errors as Record<string, string[]>).forEach(([field, msgs]) => {
          setError(field as keyof FormData, { message: msgs[0] });
        });
      } else {
        setError("root", {
          message: (data?.detail as string) || "Pendaftaran gagal. Coba lagi.",
        });
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div>
          <Link to="/" className="text-jagawana font-display font-bold text-xl">
            Lantara
          </Link>
          <h2 className="mt-4 font-display text-3xl font-bold">Buat Akun Baru</h2>
          <p className="mt-2 text-buana">
            Sudah punya akun?{" "}
            <Link to="/auth/login" className="text-khatulistiwa font-medium hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {[
            { name: "full_name" as const, label: "Nama Lengkap", type: "text", placeholder: "Sesuai KTP" },
            { name: "email" as const, label: "Email", type: "email", placeholder: "email@contoh.com" },
            { name: "phone" as const, label: "Nomor Telepon / WA", type: "tel", placeholder: "08xx-xxxx-xxxx" },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                {...register(f.name)}
                className={cn(
                  "w-full rounded-lg border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-khatulistiwa",
                  errors[f.name] ? "border-saka" : "border-border"
                )}
              />
              {errors[f.name] && (
                <p className="mt-1 text-xs text-saka">{errors[f.name]?.message}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="Minimal 8 karakter"
              {...register("password")}
              className={cn(
                "w-full rounded-lg border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-khatulistiwa",
                errors.password ? "border-saka" : "border-border"
              )}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-saka">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Konfirmasi Password</label>
            <input
              type="password"
              placeholder="Ulangi password"
              {...register("password_confirm")}
              className={cn(
                "w-full rounded-lg border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-khatulistiwa",
                errors.password_confirm ? "border-saka" : "border-border"
              )}
            />
            {errors.password_confirm && (
              <p className="mt-1 text-xs text-saka">{errors.password_confirm.message}</p>
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
            className="w-full rounded-lg bg-jagawana py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors disabled:opacity-60"
          >
            {mutation.isPending ? "Mendaftar…" : "Daftar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
