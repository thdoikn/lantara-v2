import { Link } from "react-router-dom";

export default function AdminPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-5xl">🛠️</div>
        <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
        <p className="text-buana text-sm">
          Engine builder, RBAC, dan analytics tersedia di Phase 2.
        </p>
        <Link
          to="/portal"
          className="inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          Kembali ke Portal
        </Link>
      </div>
    </div>
  );
}
