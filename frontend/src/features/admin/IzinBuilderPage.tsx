/**
 * IzinBuilderPage — the signature engine-builder UI (CLAUDE.md §4.4).
 * Left: tabbed editor (stages / form fields / doc requirements).
 * Right: live citizen-form preview using <DynamicForm />.
 * Stages and form fields support drag-to-reorder via Framer Motion Reorder.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Reorder } from "framer-motion";
import { GripVertical, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import api from "@/lib/api";
import type { FormField, WorkflowStage, DocumentRequirement } from "@/types";
import DynamicForm from "@/features/applicant/DynamicForm";

interface PermitTypeFull {
  id: string;
  key: string;
  name: string;
  description: string;
  sla_days: number;
  is_published: boolean;
  schema_version: number;
  sektor_name: string;
  stages: WorkflowStage[];
  form_fields: FormField[];
  doc_requirements: DocumentRequirement[];
}

type Tab = "stages" | "fields" | "docs";

export default function IzinBuilderPage() {
  const { sektorKey, izinKey } = useParams<{ sektorKey: string; izinKey: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("stages");
  const qc = useQueryClient();

  const { data: pt, isLoading } = useQuery<PermitTypeFull>({
    queryKey: ["admin-izin-detail", izinKey],
    queryFn: () => api.get(`/admin/engine/permit-types/${izinKey}/`).then((r) => r.data),
    enabled: !!izinKey,
  });

  const reorderStages = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.post(`/admin/engine/permit-types/${izinKey}/stages/reorder/`, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-izin-detail", izinKey] }),
  });

  const reorderFields = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.post(`/admin/engine/permit-types/${izinKey}/fields/reorder/`, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-izin-detail", izinKey] }),
  });

  if (isLoading || !pt) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  function handleStageReorder(newOrder: WorkflowStage[]) {
    reorderStages.mutate(newOrder.map((s, i) => ({ id: s.id, order: i + 1 })));
  }

  function handleFieldReorder(newOrder: FormField[]) {
    reorderFields.mutate(newOrder.map((f, i) => ({ id: f.id, order: i + 1 })));
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "stages", label: "Alur Kerja", count: pt.stages.length },
    { id: "fields", label: "Formulir", count: pt.form_fields.length },
    { id: "docs", label: "Persyaratan", count: pt.doc_requirements.length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <nav className="text-xs text-buana mb-1">
          <Link to="/admin/engine" className="hover:text-foreground">Engine Builder</Link>
          <span className="mx-1">›</span>
          <Link to={`/admin/engine/${sektorKey}`} className="hover:text-foreground capitalize">{sektorKey}</Link>
          <span className="mx-1">›</span>
          <span>{pt.name}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{pt.name}</h1>
            <p className="text-buana text-sm mt-0.5">
              SLA {pt.sla_days} hari · v{pt.schema_version} ·{" "}
              <span className={pt.is_published ? "text-jagawana" : "text-buana"}>
                {pt.is_published ? "Diterbitkan" : "Draft"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — editor */}
        <div className="w-1/2 flex flex-col border-r border-border overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-border px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? "border-jagawana text-jagawana"
                    : "border-transparent text-buana hover:text-foreground"
                }`}
                aria-current={activeTab === tab.id ? "true" : undefined}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeTab === tab.id ? "bg-jagawana/10 text-jagawana" : "bg-muted text-buana"
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 flex-1">
            {activeTab === "stages" && (
              <StagesEditor
                stages={pt.stages}
                izinKey={izinKey!}
                onReorder={handleStageReorder}
                onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-izin-detail", izinKey] })}
              />
            )}
            {activeTab === "fields" && (
              <FieldsEditor
                fields={pt.form_fields}
                izinKey={izinKey!}
                onReorder={handleFieldReorder}
                onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-izin-detail", izinKey] })}
              />
            )}
            {activeTab === "docs" && (
              <DocsEditor
                docs={pt.doc_requirements}
                izinKey={izinKey!}
                onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-izin-detail", izinKey] })}
              />
            )}
          </div>
        </div>

        {/* Right — live preview */}
        <div className="w-1/2 overflow-y-auto bg-muted/30">
          <div className="p-4 border-b border-border bg-white">
            <p className="section-label">Preview Formulir Warga</p>
          </div>
          <div className="p-6">
            <DynamicForm
              fields={pt.form_fields}
              onSubmit={() => {/* preview only */}}
              submitLabel="Preview — tidak ada efek"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stages editor ─────────────────────────────────────────────────────────────

function StagesEditor({
  stages,
  izinKey,
  onReorder,
  onRefresh,
}: {
  stages: WorkflowStage[];
  izinKey: string;
  onReorder: (s: WorkflowStage[]) => void;
  onRefresh: () => void;
}) {
  const [items, setItems] = useState(stages);
  const [, setEditingId] = useState<string | null>(null);

  const deleteStage = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/engine/permit-types/${izinKey}/stages/${id}/`),
    onSuccess: onRefresh,
  });

  function handleReorderEnd(newItems: WorkflowStage[]) {
    setItems(newItems);
    onReorder(newItems);
  }

  const STAGE_TYPE_LABEL: Record<string, string> = {
    verification: "Verifikasi",
    publish: "Penerbitan",
    collection: "Penyerahan",
    payment: "Pembayaran",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-buana font-medium uppercase tracking-wide">Drag untuk mengubah urutan</p>
        <button className="flex items-center gap-1.5 text-xs text-jagawana font-semibold hover:underline">
          <Plus className="w-3.5 h-3.5" />
          Tambah Tahap
        </button>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={handleReorderEnd} className="space-y-2">
        {items.map((stage) => (
          <Reorder.Item
            key={stage.id}
            value={stage}
            className="flex items-center gap-3 bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm px-3 py-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
          >
            <GripVertical className="w-4 h-4 text-buana shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{stage.name}</p>
              <p className="text-xs text-buana mt-0.5">
                {STAGE_TYPE_LABEL[stage.stage_type] ?? stage.stage_type} · {stage.sla_hours}j
                {stage.requires_site_visit ? " · Kunjungan" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setEditingId(stage.id)}
                className="p-1 text-buana hover:text-foreground transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteStage.mutate(stage.id)}
                className="p-1 text-buana hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

// ── Form fields editor ────────────────────────────────────────────────────────

const FIELD_TYPE_LABEL: Record<string, string> = {
  text: "Teks", number: "Angka", email: "Email", phone: "Telepon",
  textarea: "Area Teks", date: "Tanggal", select: "Pilihan",
  multiselect: "Pilihan Ganda", boolean: "Ya/Tidak", file: "File",
  nik: "NIK", npwp: "NPWP", currency: "Mata Uang", geo: "Lokasi",
};

function FieldsEditor({
  fields,
  izinKey,
  onReorder,
  onRefresh,
}: {
  fields: FormField[];
  izinKey: string;
  onReorder: (f: FormField[]) => void;
  onRefresh: () => void;
}) {
  const [items, setItems] = useState(fields);

  const deleteField = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/engine/permit-types/${izinKey}/fields/${id}/`),
    onSuccess: onRefresh,
  });

  function handleReorderEnd(newItems: FormField[]) {
    setItems(newItems);
    onReorder(newItems);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-buana font-medium uppercase tracking-wide">Drag untuk mengubah urutan</p>
        <button className="flex items-center gap-1.5 text-xs text-jagawana font-semibold hover:underline">
          <Plus className="w-3.5 h-3.5" />
          Tambah Field
        </button>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={handleReorderEnd} className="space-y-2">
        {items.map((field) => (
          <Reorder.Item
            key={field.id}
            value={field}
            className="flex items-center gap-3 bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm px-3 py-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
          >
            <GripVertical className="w-4 h-4 text-buana shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{field.label}</p>
              <p className="text-xs text-buana mt-0.5">
                {FIELD_TYPE_LABEL[field.field_type] ?? field.field_type}
                {field.required ? " · Wajib" : " · Opsional"}
                {field.section ? ` · ${field.section}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {field.required && (
                <span className="text-xs text-danger">*</span>
              )}
              <button
                onClick={() => deleteField.mutate(field.id)}
                className="p-1 text-buana hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

// ── Document requirements editor ──────────────────────────────────────────────

function DocsEditor({
  docs,
  izinKey,
  onRefresh,
}: {
  docs: DocumentRequirement[];
  izinKey: string;
  onRefresh: () => void;
}) {
  const deleteDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/engine/permit-types/${izinKey}/doc-requirements/${id}/`),
    onSuccess: onRefresh,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-buana font-medium uppercase tracking-wide">
          {docs.length} persyaratan dokumen
        </p>
        <button className="flex items-center gap-1.5 text-xs text-jagawana font-semibold hover:underline">
          <Plus className="w-3.5 h-3.5" />
          Tambah Persyaratan
        </button>
      </div>

      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm px-3 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{doc.title}</p>
              <p className="text-xs text-buana mt-0.5">
                {doc.allowed_types.join(", ").toUpperCase()} · max {Math.round(doc.max_bytes / (1024 * 1024))} MB
                {doc.required ? " · Wajib" : " · Opsional"}
              </p>
              {doc.description && (
                <p className="text-xs text-buana mt-0.5 italic">{doc.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {doc.required ? (
                <Check className="w-3.5 h-3.5 text-jagawana" />
              ) : (
                <X className="w-3.5 h-3.5 text-buana" />
              )}
              <button
                onClick={() => deleteDoc.mutate(doc.id)}
                className="p-1 text-buana hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
