import { useEffect, useState } from "react";
import { setTokens } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth";
import { getOidcRedirectUri } from "@/lib/oidc";
import api from "@/lib/api";

export default function OidcCallbackPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const savedState = sessionStorage.getItem("oidc_state");

    if (savedState && state && savedState !== state) {
      setError("State tidak cocok — kemungkinan serangan CSRF. Silakan coba lagi.");
      return;
    }

    if (!code) {
      setError("Tidak ada authorization code dari SSO.");
      return;
    }

    api
      .post("/auth/oidc/callback/", { code, redirect_uri: getOidcRedirectUri() })
      .then(({ data }) => {
        sessionStorage.removeItem("oidc_state");
        setTokens(data.access, data.refresh);
        setUser(data.user);
        // window.location.replace avoids React Router race conditions after .then()
        window.location.replace("/admin");
      })
      .catch((err) => {
        const msg =
          err.response?.data?.detail || "Login SSO gagal. Silakan coba lagi.";
        setError(msg);
      });
  }, [setUser]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-status-danger font-medium">{error}</p>
        <a
          href="/staff/login"
          className="text-royal-600 underline hover:text-royal-700"
        >
          Kembali ke halaman login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-royal-600 border-t-transparent" />
        <p className="text-ink-muted text-sm">Memproses login SSO…</p>
      </div>
    </div>
  );
}
