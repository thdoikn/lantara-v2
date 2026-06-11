/**
 * Lists all izin for a sektor; links to the builder for each.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Plus, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

interface PermitType {
  id: string;
  key: string;
  name: string;
  sla_days: number;
  is_published: boolean;
  schema_version: number;
}

export default function IzinListPage() {
  const { sektorKey } = useParams<{ sektorKey: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ results: PermitType[] }>({
    queryKey: ["admin-izin-list", sektorKey],
    queryFn: () =>
      api.get(`/admin/engine/permit-types/?sektor__key=${sektorKey}&page_size=50`).then((r) => r.data),
    enabled: !!sektorKey,
  });

  const togglePublish = useMutation({
    mutationFn: ({ key, published }: { key: string; published: boolean }) =>
      api.post(`/admin/engine/permit-types/${key}/${published ? "unpublish" : "publish"}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-izin-list", sektorKey] }),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-xs text-buana mb-1">
            <Link to="/admin/engine" className="hover:text-foreground">Engine Builder</Link>
            <span className="mx-1">›</span>
            <span className="capitalize">{sektorKey}</span>
          </nav>
          <h1 className="font-display text-2xl font-bold capitalize">{sektorKey}</h1>
          <p className="text-buana text-sm">{data?.results.length ?? 0} jenis izin</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-jagawana-deep transition-colors">
          <Plus className="w-4 h-4" />
          Tambah Izin
        </button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {data?.results.map((pt) => (
          <div key={pt.key} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 group">
            <Link
              to={`/admin/engine/${sektorKey}/${pt.key}`}
              className="flex-1 flex items-center gap-4 min-w-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{pt.name}</p>
                <p className="text-xs text-buana mt-0.5">
                  SLA {pt.sla_days} hari · v{pt.schema_version}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 ml-4 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  pt.is_published ? "bg-jagawana/10 text-jagawana" : "bg-muted text-buana"
                }`}
              >
                {pt.is_published ? "Diterbitkan" : "Draft"}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  togglePublish.mutate({ key: pt.key, published: pt.is_published });
                }}
                title={pt.is_published ? "Nonaktifkan" : "Terbitkan"}
                className="p-1 text-buana hover:text-foreground transition-colors"
              >
                {pt.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <Link to={`/admin/engine/${sektorKey}/${pt.key}`} className="p-1 text-buana hover:text-foreground">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
