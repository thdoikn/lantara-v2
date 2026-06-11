import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-6">
      <h1 className="font-display text-8xl font-bold text-jagawana/30">404</h1>
      <p className="text-xl font-medium">Halaman tidak ditemukan</p>
      <Link
        to="/"
        className="rounded-lg bg-jagawana px-6 py-2 text-white font-medium hover:bg-jagawana-deep transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
