import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

const schema = z.object({ email: z.string().email("Format email tidak valid") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/auth/password/reset/", data),
    onSuccess: (_, vars) =>
      navigate("/auth/verify-otp", { state: { email: vars.email, purpose: "password_reset" } }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <Link to="/auth/login" className="text-khatulistiwa text-sm hover:underline">
            ← Kembali ke login
          </Link>
          <h2 className="mt-4 font-display text-2xl font-bold">Lupa Password</h2>
          <p className="mt-1 text-sm text-buana">
            Masukkan email terdaftar Anda untuk menerima kode reset.
          </p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              {...register("email")}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-khatulistiwa"
              placeholder="email@contoh.com"
            />
            {errors.email && <p className="mt-1 text-xs text-saka">{errors.email.message}</p>}
          </div>

          {mutation.isSuccess && (
            <div className="rounded-lg bg-jagawana/10 border border-jagawana/30 px-4 py-3 text-sm text-jagawana-deep">
              Jika email terdaftar, kode reset telah dikirim.
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-jagawana py-2.5 text-sm font-semibold text-white hover:bg-jagawana-deep transition-colors disabled:opacity-60"
          >
            {mutation.isPending ? "Mengirim…" : "Kirim Kode Reset"}
          </button>
        </form>
      </div>
    </div>
  );
}
