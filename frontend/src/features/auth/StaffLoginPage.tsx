import { buildAuthorizationUrl, isSsoEnabled } from "@/lib/oidc";

export default function StaffLoginPage() {
  const handleSsoLogin = () => {
    window.location.href = buildAuthorizationUrl();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-royal-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Portal Internal</p>
          <h1 className="text-2xl font-bold text-white">Login Pegawai OIKN</h1>
          <p className="mt-2 text-sm text-white/50">
            Gunakan akun SSO OIKN Anda untuk masuk
          </p>
        </div>

        {isSsoEnabled() ? (
          <button
            onClick={handleSsoLogin}
            className="w-full rounded-xl bg-royal-600 px-4 py-3 text-sm font-semibold text-white
                       hover:bg-royal-700 focus:outline-none focus:ring-2 focus:ring-royal-500
                       focus:ring-offset-2 focus:ring-offset-royal-900 transition-colors"
          >
            Login dengan SSO OIKN
          </button>
        ) : (
          <p className="text-center text-sm text-white/40">
            SSO belum dikonfigurasi. Hubungi administrator.
          </p>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Kembali ke halaman publik
          </a>
        </div>
      </div>
    </div>
  );
}
