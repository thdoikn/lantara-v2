import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FormField, DocumentRequirement, PermitType } from "@/types";
import { cn } from "@/lib/cn";

// ── Runtime zod builder ─────────────────────────────────────────────────────

function buildZodSchema(fields: FormField[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const f of fields) {
    let schema: z.ZodTypeAny;

    switch (f.field_type) {
      case "email":
        schema = z.string().email("Format email tidak valid");
        break;
      case "number":
      case "currency":
        schema = z.coerce.number({ invalid_type_error: "Harus berupa angka" });
        break;
      case "date":
        schema = z.string().min(1, "Tanggal wajib diisi");
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "multiselect":
        schema = z.array(z.string()).min(1, "Pilih setidaknya satu opsi");
        break;
      case "file":
        schema = z.instanceof(File).nullable();
        break;
      default:
        schema = z.string();
    }

    if (f.validation_json?.minLength) {
      if (schema instanceof z.ZodString) {
        schema = (schema as z.ZodString).min(
          f.validation_json.minLength,
          `Minimal ${f.validation_json.minLength} karakter`
        );
      }
    }
    if (f.validation_json?.maxLength) {
      if (schema instanceof z.ZodString) {
        schema = (schema as z.ZodString).max(
          f.validation_json.maxLength,
          `Maksimal ${f.validation_json.maxLength} karakter`
        );
      }
    }
    if (f.validation_json?.pattern) {
      if (schema instanceof z.ZodString) {
        schema = (schema as z.ZodString).regex(
          new RegExp(f.validation_json.pattern),
          f.validation_json.patternMessage ?? "Format tidak valid"
        );
      }
    }

    const isRequired =
      f.required !== false &&
      f.field_type !== "boolean" &&
      f.field_type !== "file";

    if (!isRequired) {
      schema = schema.optional();
    } else if (schema instanceof z.ZodString) {
      schema = (schema as z.ZodString).min(1, `${f.label} wajib diisi`);
    }

    shape[f.key] = schema;
  }

  return z.object(shape);
}

// ── Field renderers ─────────────────────────────────────────────────────────

const inputBase =
  "w-full rounded-xl border border-khatulistiwa-200/70 px-4 py-3 text-sm bg-[#F8FAFF] text-khatulistiwa-900 focus:outline-none focus:border-khatulistiwa-500 focus:ring-2 focus:ring-khatulistiwa-500/15 placeholder:text-khatulistiwa-300/50 disabled:opacity-60 transition-all";

function FieldLabel({ field, error }: { field: FormField; error?: string }) {
  return (
    <div>
      <label htmlFor={field.key} className="block text-khatulistiwa-900 font-semibold text-sm mb-1.5">
        {field.label}
        {field.validation_json?.required !== false && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>
      {field.validation_json?.help_text && (
        <p className="text-xs text-khatulistiwa-400/60 mb-1.5">{field.validation_json.help_text}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── DynamicForm component ───────────────────────────────────────────────────

interface Props {
  /** Provide either permitType OR fields directly (for engine-builder preview). */
  permitType?: PermitType;
  fields?: FormField[];
  docRequirements?: DocumentRequirement[];
  defaultValues?: Record<string, unknown>;
  onSubmit: (formData: Record<string, unknown>, files: Map<string, File>) => void;
  isSubmitting?: boolean;
  /** Override the submit button label */
  submitLabel?: string;
}

export default function DynamicForm({
  permitType,
  fields: fieldsProp,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Props) {
  const fields = fieldsProp ?? permitType?.form_fields ?? [];

  const zodSchema = useMemo(() => buildZodSchema(fields), [fields]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues ?? {},
  });

  useEffect(() => {
    if (defaultValues) reset(defaultValues);
  }, [defaultValues, reset]);

  const watchAll = watch();

  function isFieldVisible(f: FormField): boolean {
    if (!f.conditional_field_key) return true;
    return watchAll[f.conditional_field_key] === f.conditional_field_value;
  }

  const fileMap = new Map<string, File>();

  function handleFormSubmit(data: Record<string, unknown>) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v instanceof File) {
        fileMap.set(k, v);
      } else {
        clean[k] = v;
      }
    }
    onSubmit(clean, fileMap);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as never)} className="space-y-6" noValidate>
      {fields.map((f) => {
        if (!isFieldVisible(f)) return null;
        const errMsg = (errors[f.key] as { message?: string })?.message;

        return (
          <div key={f.key}>
            {/* Text / email / number / currency / tel / nik / npwp / phone */}
            {["text", "email", "number", "currency", "tel", "nik", "npwp", "phone"].includes(f.field_type) && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <input
                  id={f.key}
                  type={
                    f.field_type === "email"
                      ? "email"
                      : f.field_type === "number" || f.field_type === "currency"
                      ? "number"
                      : f.field_type === "tel" || f.field_type === "phone"
                      ? "tel"
                      : "text"
                  }
                  inputMode={
                    f.field_type === "nik" || f.field_type === "npwp" ? "numeric" : undefined
                  }
                  {...register(f.key)}
                  className={cn(inputBase, errMsg && "border-saka focus:ring-saka")}
                  placeholder={
                    f.validation_json?.placeholder ??
                    (f.field_type === "nik" ? "Masukkan 16 digit NIK" :
                     f.field_type === "npwp" ? "Masukkan nomor NPWP" :
                     f.field_type === "phone" ? "Contoh: 08123456789" : "")
                  }
                />
              </div>
            )}

            {/* Textarea */}
            {f.field_type === "textarea" && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <textarea
                  id={f.key}
                  {...register(f.key)}
                  rows={4}
                  className={cn(inputBase, "resize-y", errMsg && "border-saka focus:ring-saka")}
                  placeholder={f.validation_json?.placeholder ?? ""}
                />
              </div>
            )}

            {/* Date */}
            {f.field_type === "date" && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <input
                  id={f.key}
                  type="date"
                  {...register(f.key)}
                  className={cn(inputBase, errMsg && "border-saka focus:ring-saka")}
                />
              </div>
            )}

            {/* Select */}
            {f.field_type === "select" && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <select
                  id={f.key}
                  {...register(f.key)}
                  className={cn(inputBase, errMsg && "border-saka focus:ring-saka")}
                >
                  <option value="">— Pilih —</option>
                  {(f.options_json ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Multiselect — checkboxes */}
            {f.field_type === "multiselect" && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <Controller
                  name={f.key}
                  control={control}
                  defaultValue={[]}
                  render={({ field: ctrl }) => (
                    <div className="space-y-2">
                      {(f.options_json ?? []).map((opt) => {
                        const checked = (ctrl.value as string[]).includes(opt.value);
                        return (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const current = ctrl.value as string[];
                                ctrl.onChange(
                                  checked
                                    ? current.filter((v) => v !== opt.value)
                                    : [...current, opt.value]
                                );
                              }}
                              className="h-4 w-4 rounded border-khatulistiwa-200 text-khatulistiwa-600 focus:ring-khatulistiwa-500"
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            )}

            {/* Boolean — toggle */}
            {f.field_type === "boolean" && (
              <Controller
                name={f.key}
                control={control}
                defaultValue={false}
                render={({ field: ctrl }) => (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      role="switch"
                      aria-checked={ctrl.value as boolean}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") ctrl.onChange(!ctrl.value);
                      }}
                      onClick={() => ctrl.onChange(!ctrl.value)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-khatulistiwa",
                        ctrl.value ? "bg-khatulistiwa-600" : "bg-khatulistiwa-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                          ctrl.value ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </div>
                    <span className="text-sm font-medium">{f.label}</span>
                  </label>
                )}
              />
            )}

            {/* File — handled at submission level via docRequirements, shown as info */}
            {f.field_type === "file" && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <input
                  id={f.key}
                  type="file"
                  accept={f.validation_json?.acceptedTypes ?? "*"}
                  {...register(f.key)}
                  className="text-sm text-khatulistiwa-600 file:mr-3 file:rounded-lg file:border-0 file:bg-khatulistiwa-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-khatulistiwa-600 hover:file:bg-khatulistiwa-100 transition-all"
                />
              </div>
            )}

            {/* Geo */}
            {f.field_type === "geo" && (
              <div>
                <FieldLabel field={f} error={errMsg} />
                <input
                  id={f.key}
                  type="text"
                  {...register(f.key)}
                  className={cn(inputBase, errMsg && "border-saka focus:ring-saka")}
                  placeholder="Contoh: -6.200000,106.816666"
                />
                <p className="text-xs text-buana mt-1">Format: lintang,bujur (desimal)</p>
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-khatulistiwa-600 hover:bg-khatulistiwa-500 py-3.5 text-sm font-display font-bold text-white transition-all shadow-md shadow-khatulistiwa-600/20 disabled:opacity-60"
        >
          {isSubmitting ? "Mengirim…" : (submitLabel ?? "Lanjutkan →")}
        </button>
      </div>
    </form>
  );
}
