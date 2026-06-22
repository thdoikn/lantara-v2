/**
 * IzinBuilderPage — the signature engine-builder UI (CLAUDE.md §4.4).
 * Left: tabbed editor (stages / form fields / doc requirements).
 * Right: live citizen-form preview using <DynamicForm />.
 * Stages and form fields support drag-to-reorder via Framer Motion Reorder.
 * All five CRUD operations (add/edit for stages, fields, docs) are wired up.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Reorder } from "framer-motion";
import { GripVertical, Plus, Trash2, Edit3, X, Check } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
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

// ── Shared modal primitives ───────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 animate-in fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-semibold text-base text-ink">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded text-ink-muted hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, required, error, hint, children }: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 transition-colors";
const selectCls = inputCls + " bg-white";

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ── Stage Modal ───────────────────────────────────────────────────────────────

const STAGE_TYPES = [
  { value: "verification", label: "Verifikasi" },
  { value: "payment", label: "Pembayaran" },
  { value: "external", label: "Proses Eksternal" },
  { value: "publish", label: "Penerbitan" },
  { value: "collection", label: "Pengambilan" },
] as const;

const ACTION_OPTIONS = ["approve", "revise", "reject", "generate", "sign", "visit", "payment"];

interface StageForm {
  key: string;
  name: string;
  stage_type: string;
  actor_role: string;
  sla_hours: string;
  requires_site_visit: boolean;
  allowed_actions: string[];
  is_terminal: boolean;
  instructions: string;
}

function StageModal({
  open,
  onClose,
  izinKey,
  nextOrder,
  initial,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  izinKey: string;
  nextOrder: number;
  initial?: WorkflowStage;
  onSuccess: () => void;
}) {
  const isEdit = !!initial;

  const [form, setForm] = useState<StageForm>(
    initial
      ? {
          key: initial.key,
          name: initial.name,
          stage_type: initial.stage_type,
          actor_role: initial.actor_role,
          sla_hours: String(initial.sla_hours),
          requires_site_visit: initial.requires_site_visit,
          allowed_actions: initial.allowed_actions,
          is_terminal: initial.is_terminal,
          instructions: initial.instructions,
        }
      : {
          key: "",
          name: "",
          stage_type: "verification",
          actor_role: "",
          sla_hours: "24",
          requires_site_visit: false,
          allowed_actions: ["approve", "revise", "reject"],
          is_terminal: false,
          instructions: "",
        }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof StageForm, string>>>({});

  const save = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? api.patch(`/admin/engine/permit-types/${izinKey}/stages/${initial!.id}/`, body)
        : api.post(`/admin/engine/permit-types/${izinKey}/stages/`, body),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  function set<K extends keyof StageForm>(field: K, value: StageForm[K]) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "name" && !isEdit) next.key = slugify(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggleAction(action: string) {
    setForm((f) => ({
      ...f,
      allowed_actions: f.allowed_actions.includes(action)
        ? f.allowed_actions.filter((a) => a !== action)
        : [...f.allowed_actions, action],
    }));
  }

  function validate() {
    const e: Partial<Record<keyof StageForm, string>> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.key.trim()) e.key = "Key wajib diisi";
    if (!form.stage_type) e.stage_type = "Tipe wajib dipilih";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    save.mutate({
      key: form.key,
      name: form.name,
      stage_type: form.stage_type,
      actor_role: form.actor_role,
      sla_hours: parseInt(form.sla_hours) || 0,
      requires_site_visit: form.requires_site_visit,
      allowed_actions: form.allowed_actions,
      is_terminal: form.is_terminal,
      instructions: form.instructions,
      order: isEdit ? initial!.order : nextOrder,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Tahap" : "Tambah Tahap"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama Tahap" required error={errors.name}>
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="cth. Verifikasi Tim Teknis" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Key (slug)" required error={errors.key}>
            <input
              className={inputCls}
              value={form.key}
              onChange={(e) => set("key", slugify(e.target.value))}
              disabled={isEdit}
            />
          </Field>
          <Field label="Tipe Tahap" required error={errors.stage_type}>
            <select className={selectCls} value={form.stage_type} onChange={(e) => set("stage_type", e.target.value)}>
              {STAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Pelaksana / Peran">
            <input className={inputCls} value={form.actor_role} onChange={(e) => set("actor_role", e.target.value)} placeholder="tim_teknis" />
          </Field>
          <Field label="SLA (jam)">
            <input type="number" min={0} className={inputCls} value={form.sla_hours} onChange={(e) => set("sla_hours", e.target.value)} />
          </Field>
        </div>

        <Field label="Aksi yang Diizinkan">
          <div className="flex flex-wrap gap-2 mt-1">
            {ACTION_OPTIONS.map((action) => (
              <label key={action} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.allowed_actions.includes(action)}
                  onChange={() => toggleAction(action)}
                  className="rounded border-border text-royal-600"
                />
                <span className="text-xs font-mono">{action}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Instruksi untuk Petugas">
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="Panduan singkat untuk petugas di tahap ini"
          />
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.requires_site_visit}
              onChange={(e) => set("requires_site_visit", e.target.checked)}
              className="rounded border-border text-royal-600"
            />
            <span className="text-sm">Kunjungan Lapangan</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_terminal}
              onChange={(e) => set("is_terminal", e.target.checked)}
              className="rounded border-border text-royal-600"
            />
            <span className="text-sm">Tahap Terminal (akhir alur)</span>
          </label>
        </div>

        {save.isError && (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">Gagal menyimpan. Periksa kembali data Anda.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Batal</button>
          <button
            type="submit"
            disabled={save.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-royal-700 text-white font-medium hover:bg-royal-800 disabled:opacity-60 transition-colors"
          >
            {save.isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Tahap"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Field Modal ───────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: "text", label: "Teks" },
  { value: "textarea", label: "Teks Panjang" },
  { value: "number", label: "Angka" },
  { value: "currency", label: "Mata Uang" },
  { value: "date", label: "Tanggal" },
  { value: "select", label: "Pilihan Tunggal" },
  { value: "multiselect", label: "Pilihan Ganda" },
  { value: "boolean", label: "Ya / Tidak" },
  { value: "file", label: "File Upload" },
  { value: "nik", label: "NIK" },
  { value: "npwp", label: "NPWP" },
  { value: "phone", label: "Nomor Telepon" },
  { value: "email", label: "Email" },
  { value: "geo", label: "Koordinat Lokasi" },
];

interface FieldForm {
  key: string;
  label: string;
  field_type: string;
  section: string;
  required: boolean;
  placeholder: string;
  help_text_field: string;
  prefill_from_profile: boolean;
  options: Array<{ value: string; label: string }>;
  val_min_length: string;
  val_max_length: string;
  val_pattern: string;
  val_pattern_msg: string;
}

function FieldModal({
  open,
  onClose,
  izinKey,
  nextOrder,
  initial,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  izinKey: string;
  nextOrder: number;
  initial?: FormField;
  onSuccess: () => void;
}) {
  const isEdit = !!initial;

  const [form, setForm] = useState<FieldForm>(
    initial
      ? {
          key: initial.key,
          label: initial.label,
          field_type: initial.field_type,
          section: initial.section,
          required: initial.required,
          placeholder: initial.placeholder,
          help_text_field: initial.help_text_field,
          prefill_from_profile: initial.prefill_from_profile,
          options: initial.options_json ?? [],
          val_min_length: String(initial.validation_json?.minLength ?? ""),
          val_max_length: String(initial.validation_json?.maxLength ?? ""),
          val_pattern: String(initial.validation_json?.pattern ?? ""),
          val_pattern_msg: String(initial.validation_json?.patternMessage ?? ""),
        }
      : {
          key: "",
          label: "",
          field_type: "text",
          section: "",
          required: true,
          placeholder: "",
          help_text_field: "",
          prefill_from_profile: false,
          options: [],
          val_min_length: "",
          val_max_length: "",
          val_pattern: "",
          val_pattern_msg: "",
        }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FieldForm, string>>>({});
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const save = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? api.patch(`/admin/engine/permit-types/${izinKey}/fields/${initial!.id}/`, body)
        : api.post(`/admin/engine/permit-types/${izinKey}/fields/`, body),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  function set<K extends keyof FieldForm>(field: K, value: FieldForm[K]) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "label" && !isEdit) next.key = slugify(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function addOption() {
    const label = newOptionLabel.trim();
    if (!label) return;
    setForm((f) => ({
      ...f,
      options: [...f.options, { value: slugify(label), label }],
    }));
    setNewOptionLabel("");
  }

  function removeOption(idx: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  }

  const needsOptions = form.field_type === "select" || form.field_type === "multiselect";

  function validate() {
    const e: Partial<Record<keyof FieldForm, string>> = {};
    if (!form.label.trim()) e.label = "Label wajib diisi";
    if (!form.key.trim()) e.key = "Key wajib diisi";
    if (!form.field_type) e.field_type = "Tipe wajib dipilih";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const validation_json: Record<string, unknown> = {};
    if (form.val_min_length) validation_json.minLength = parseInt(form.val_min_length);
    if (form.val_max_length) validation_json.maxLength = parseInt(form.val_max_length);
    if (form.val_pattern) validation_json.pattern = form.val_pattern;
    if (form.val_pattern_msg) validation_json.patternMessage = form.val_pattern_msg;

    save.mutate({
      key: form.key,
      label: form.label,
      field_type: form.field_type,
      section: form.section,
      required: form.required,
      placeholder: form.placeholder,
      help_text_field: form.help_text_field,
      prefill_from_profile: form.prefill_from_profile,
      options_json: needsOptions ? form.options : [],
      validation_json,
      order: isEdit ? initial!.order : nextOrder,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Field" : "Tambah Field"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Label Field" required error={errors.label}>
          <input className={inputCls} value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="cth. Nama Lengkap" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Key (slug)" required error={errors.key}>
            <input className={inputCls} value={form.key} onChange={(e) => set("key", slugify(e.target.value))} disabled={isEdit} />
          </Field>
          <Field label="Tipe Field" required>
            <select className={selectCls} value={form.field_type} onChange={(e) => set("field_type", e.target.value)}>
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Seksi / Grup">
            <input className={inputCls} value={form.section} onChange={(e) => set("section", e.target.value)} placeholder="cth. Data Pemohon" />
          </Field>
          <Field label="Placeholder">
            <input className={inputCls} value={form.placeholder} onChange={(e) => set("placeholder", e.target.value)} />
          </Field>
        </div>

        <Field label="Teks Bantuan (help text)">
          <input className={inputCls} value={form.help_text_field} onChange={(e) => set("help_text_field", e.target.value)} placeholder="Penjelasan singkat untuk pemohon" />
        </Field>

        {/* Options (select/multiselect) */}
        {needsOptions && (
          <Field label="Pilihan">
            <div className="space-y-1.5 mt-1">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-1.5">
                  <span className="font-mono text-ink-muted mr-2">{opt.value}</span>
                  <span className="flex-1">{opt.label}</span>
                  <button type="button" onClick={() => removeOption(idx)} className="text-ink-muted hover:text-danger ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  placeholder="Label pilihan baru"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Field>
        )}

        {/* Validation rules */}
        <details className="group">
          <summary className="text-sm font-medium text-ink-muted cursor-pointer select-none hover:text-ink">
            Aturan Validasi (opsional)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Min. Panjang">
              <input type="number" min={0} className={inputCls} value={form.val_min_length} onChange={(e) => set("val_min_length", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Maks. Panjang">
              <input type="number" min={0} className={inputCls} value={form.val_max_length} onChange={(e) => set("val_max_length", e.target.value)} placeholder="tidak dibatasi" />
            </Field>
            <Field label="Pola Regex" hint="cth. ^[0-9]{16}$">
              <input className={inputCls} value={form.val_pattern} onChange={(e) => set("val_pattern", e.target.value)} placeholder="^[A-Za-z ]+$" />
            </Field>
            <Field label="Pesan Error Pola">
              <input className={inputCls} value={form.val_pattern_msg} onChange={(e) => set("val_pattern_msg", e.target.value)} placeholder="Format tidak valid" />
            </Field>
          </div>
        </details>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => set("required", e.target.checked)}
              className="rounded border-border text-royal-600"
            />
            <span className="text-sm">Wajib diisi</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.prefill_from_profile}
              onChange={(e) => set("prefill_from_profile", e.target.checked)}
              className="rounded border-border text-royal-600"
            />
            <span className="text-sm">Pre-isi dari profil</span>
          </label>
        </div>

        {save.isError && (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">Gagal menyimpan. Periksa kembali data Anda.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Batal</button>
          <button
            type="submit"
            disabled={save.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-royal-700 text-white font-medium hover:bg-royal-800 disabled:opacity-60 transition-colors"
          >
            {save.isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Field"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Doc Requirement Modal ─────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS = ["pdf", "jpg", "jpeg", "png", "docx", "xlsx"];

interface DocForm {
  key: string;
  title: string;
  description: string;
  allowed_types: string[];
  max_mb: string;
  required: boolean;
  conditional_field_key: string;
  conditional_field_value: string;
}

function DocModal({
  open,
  onClose,
  izinKey,
  nextOrder,
  initial,
  availableFieldKeys,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  izinKey: string;
  nextOrder: number;
  initial?: DocumentRequirement;
  availableFieldKeys: string[];
  onSuccess: () => void;
}) {
  const isEdit = !!initial;

  const [form, setForm] = useState<DocForm>(
    initial
      ? {
          key: initial.key,
          title: initial.title,
          description: initial.description,
          allowed_types: initial.allowed_types,
          max_mb: String(Math.round(initial.max_bytes / (1024 * 1024))),
          required: initial.required,
          conditional_field_key: initial.conditional_field_key ?? "",
          conditional_field_value: initial.conditional_field_value ?? "",
        }
      : {
          key: "",
          title: "",
          description: "",
          allowed_types: ["pdf"],
          max_mb: "5",
          required: true,
          conditional_field_key: "",
          conditional_field_value: "",
        }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof DocForm, string>>>({});

  const save = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? api.patch(`/admin/engine/permit-types/${izinKey}/doc-requirements/${initial!.id}/`, body)
        : api.post(`/admin/engine/permit-types/${izinKey}/doc-requirements/`, body),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  function set<K extends keyof DocForm>(field: K, value: DocForm[K]) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "title" && !isEdit) next.key = slugify(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggleType(type: string) {
    setForm((f) => ({
      ...f,
      allowed_types: f.allowed_types.includes(type)
        ? f.allowed_types.filter((t) => t !== type)
        : [...f.allowed_types, type],
    }));
  }

  function validate() {
    const e: Partial<Record<keyof DocForm, string>> = {};
    if (!form.title.trim()) e.title = "Judul wajib diisi";
    if (!form.key.trim()) e.key = "Key wajib diisi";
    if (!form.allowed_types.length) e.allowed_types = "Pilih minimal satu tipe file";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    save.mutate({
      key: form.key,
      title: form.title,
      description: form.description,
      allowed_types: form.allowed_types,
      max_bytes: Math.round(parseFloat(form.max_mb) * 1024 * 1024),
      required: form.required,
      conditional_field_key: form.conditional_field_key,
      conditional_field_value: form.conditional_field_value,
      order: isEdit ? initial!.order : nextOrder,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Persyaratan" : "Tambah Persyaratan Dokumen"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Judul Dokumen" required error={errors.title}>
          <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="cth. KTP Pemohon" />
        </Field>

        <Field label="Key (slug)" required error={errors.key}>
          <input className={inputCls} value={form.key} onChange={(e) => set("key", slugify(e.target.value))} disabled={isEdit} />
        </Field>

        <Field label="Deskripsi / Keterangan">
          <textarea className={inputCls + " resize-none"} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Penjelasan dokumen untuk pemohon" />
        </Field>

        <Field label="Tipe File yang Diterima" error={errors.allowed_types}>
          <div className="flex flex-wrap gap-2 mt-1">
            {DOC_TYPE_OPTIONS.map((type) => (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.allowed_types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="rounded border-border text-royal-600"
                />
                <span className="text-xs font-mono uppercase">{type}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Ukuran Maks. (MB)">
          <input type="number" min={0.1} step={0.1} className={inputCls} value={form.max_mb} onChange={(e) => set("max_mb", e.target.value)} />
        </Field>

        {/* Conditional logic */}
        {availableFieldKeys.length > 0 && (
          <details className="group">
            <summary className="text-sm font-medium text-ink-muted cursor-pointer select-none hover:text-ink">
              Syarat Kondisional (opsional)
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Field Acuan" hint="Kosongkan jika selalu wajib">
                <select className={selectCls} value={form.conditional_field_key} onChange={(e) => set("conditional_field_key", e.target.value)}>
                  <option value="">— Tidak ada —</option>
                  {availableFieldKeys.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nilai yang Memicu">
                <input className={inputCls} value={form.conditional_field_value} onChange={(e) => set("conditional_field_value", e.target.value)} placeholder="cth. ya" disabled={!form.conditional_field_key} />
              </Field>
            </div>
          </details>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.required}
            onChange={(e) => set("required", e.target.checked)}
            className="rounded border-border text-royal-600"
          />
          <span className="text-sm">Dokumen wajib</span>
        </label>

        {save.isError && (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">Gagal menyimpan. Periksa kembali data Anda.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Batal</button>
          <button
            type="submit"
            disabled={save.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-royal-700 text-white font-medium hover:bg-royal-800 disabled:opacity-60 transition-colors"
          >
            {save.isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Persyaratan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-izin-detail", izinKey] });
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
        <nav className="text-xs text-ink-muted mb-1">
          <Link to="/admin/engine" className="hover:text-ink">Engine Builder</Link>
          <span className="mx-1">›</span>
          <Link to={`/admin/engine/${sektorKey}`} className="hover:text-ink capitalize">{sektorKey}</Link>
          <span className="mx-1">›</span>
          <span>{pt.name}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{pt.name}</h1>
            <p className="text-ink-muted text-sm mt-0.5">
              SLA {pt.sla_days} hari · v{pt.schema_version} ·{" "}
              <span className={pt.is_published ? "text-status-success" : "text-ink-muted"}>
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
                    ? "border-royal-600 text-royal-600"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
                aria-current={activeTab === tab.id ? "true" : undefined}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeTab === tab.id ? "bg-royal-600/10 text-royal-600" : "bg-muted text-ink-muted"
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
                onRefresh={refresh}
              />
            )}
            {activeTab === "fields" && (
              <FieldsEditor
                fields={pt.form_fields}
                izinKey={izinKey!}
                onReorder={handleFieldReorder}
                onRefresh={refresh}
              />
            )}
            {activeTab === "docs" && (
              <DocsEditor
                docs={pt.doc_requirements}
                izinKey={izinKey!}
                fieldKeys={pt.form_fields.map((f) => f.key)}
                onRefresh={refresh}
              />
            )}
          </div>
        </div>

        {/* Right — live preview */}
        <div className="w-1/2 overflow-y-auto bg-muted/30">
          <div className="p-4 border-b border-border bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview Formulir Warga</p>
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

const STAGE_TYPE_LABEL: Record<string, string> = {
  verification: "Verifikasi",
  publish: "Penerbitan",
  collection: "Penyerahan",
  payment: "Pembayaran",
  external: "Proses Eksternal",
};

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
  const [showAdd, setShowAdd] = useState(false);
  const [editStage, setEditStage] = useState<WorkflowStage | null>(null);

  const deleteStage = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/engine/permit-types/${izinKey}/stages/${id}/`),
    onSuccess: onRefresh,
  });

  function handleReorderEnd(newItems: WorkflowStage[]) {
    setItems(newItems);
    onReorder(newItems);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-ink-muted font-medium uppercase tracking-wide">Drag untuk mengubah urutan</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-royal-600 font-semibold hover:underline"
        >
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
            <GripVertical className="w-4 h-4 text-ink-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{stage.name}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {STAGE_TYPE_LABEL[stage.stage_type] ?? stage.stage_type} · {stage.sla_hours}j
                {stage.requires_site_visit ? " · Kunjungan" : ""}
                {stage.is_terminal ? " · Terminal" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setEditStage(stage)}
                className="p-1 text-ink-muted hover:text-ink transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteStage.mutate(stage.id)}
                className="p-1 text-ink-muted hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <StageModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        izinKey={izinKey}
        nextOrder={items.length + 1}
        onSuccess={onRefresh}
      />
      {editStage && (
        <StageModal
          key={editStage.id}
          open={true}
          onClose={() => setEditStage(null)}
          izinKey={izinKey}
          nextOrder={items.length + 1}
          initial={editStage}
          onSuccess={onRefresh}
        />
      )}
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
  const [showAdd, setShowAdd] = useState(false);
  const [editField, setEditField] = useState<FormField | null>(null);

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
        <p className="text-xs text-ink-muted font-medium uppercase tracking-wide">Drag untuk mengubah urutan</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-royal-600 font-semibold hover:underline"
        >
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
            <GripVertical className="w-4 h-4 text-ink-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{field.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {FIELD_TYPE_LABEL[field.field_type] ?? field.field_type}
                {field.required ? " · Wajib" : " · Opsional"}
                {field.section ? ` · ${field.section}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {field.required && <span className="text-xs text-danger">*</span>}
              <button
                onClick={() => setEditField(field)}
                className="p-1 text-ink-muted hover:text-ink transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteField.mutate(field.id)}
                className="p-1 text-ink-muted hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <FieldModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        izinKey={izinKey}
        nextOrder={items.length + 1}
        onSuccess={onRefresh}
      />
      {editField && (
        <FieldModal
          key={editField.id}
          open={true}
          onClose={() => setEditField(null)}
          izinKey={izinKey}
          nextOrder={items.length + 1}
          initial={editField}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

// ── Document requirements editor ──────────────────────────────────────────────

function DocsEditor({
  docs,
  izinKey,
  fieldKeys,
  onRefresh,
}: {
  docs: DocumentRequirement[];
  izinKey: string;
  fieldKeys: string[];
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentRequirement | null>(null);

  const deleteDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/engine/permit-types/${izinKey}/doc-requirements/${id}/`),
    onSuccess: onRefresh,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-ink-muted font-medium uppercase tracking-wide">
          {docs.length} persyaratan dokumen
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-royal-600 font-semibold hover:underline"
        >
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
              <p className="text-xs text-ink-muted mt-0.5">
                {doc.allowed_types.join(", ").toUpperCase()} · max {Math.round(doc.max_bytes / (1024 * 1024))} MB
                {doc.required ? " · Wajib" : " · Opsional"}
                {doc.conditional_field_key ? ` · Kondisi: ${doc.conditional_field_key}` : ""}
              </p>
              {doc.description && (
                <p className="text-xs text-ink-muted mt-0.5 italic">{doc.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {doc.required ? (
                <Check className="w-3.5 h-3.5 text-status-success" />
              ) : (
                <X className="w-3.5 h-3.5 text-ink-muted" />
              )}
              <button
                onClick={() => setEditDoc(doc)}
                className="p-1 text-ink-muted hover:text-ink transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteDoc.mutate(doc.id)}
                className="p-1 text-ink-muted hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DocModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        izinKey={izinKey}
        nextOrder={docs.length + 1}
        availableFieldKeys={fieldKeys}
        onSuccess={onRefresh}
      />
      {editDoc && (
        <DocModal
          key={editDoc.id}
          open={true}
          onClose={() => setEditDoc(null)}
          izinKey={izinKey}
          nextOrder={docs.length + 1}
          initial={editDoc}
          availableFieldKeys={fieldKeys}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
