import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FormField } from "@/types";

/**
 * Controlled, type-aware editor for a single form field — used when an applicant
 * fixes a verifier-flagged field during a revision. Mirrors DynamicForm's
 * controls (select/date/number/multiselect/boolean/…) but is fully controlled so
 * it plugs into the submission page's local `edits` state. File fields are
 * excluded here (documents are revised via the upload section).
 */

const inputCls =
  "w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm text-khatulistiwa-900 " +
  "placeholder-khatulistiwa-300 outline-none focus:border-khatulistiwa-400 focus:ring-2 " +
  "focus:ring-khatulistiwa-400/15 transition-all";

export default function RevisionFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const t = field.field_type;

  if (t === "textarea") {
    return (
      <textarea
        id={field.key}
        rows={3}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.validation_json?.placeholder ?? "Perbaiki nilai…"}
        className={cn(inputCls, "resize-y")}
        aria-label={`Perbaiki ${field.label}`}
      />
    );
  }

  if (t === "date") {
    return (
      <input
        id={field.key}
        type="date"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        aria-label={`Perbaiki ${field.label}`}
      />
    );
  }

  if (t === "select") {
    return (
      <div className="relative">
        <select
          id={field.key}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "appearance-none pr-9")}
          aria-label={`Perbaiki ${field.label}`}
        >
          <option value="">— Pilih —</option>
          {(field.options_json ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-khatulistiwa-400 pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (t === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        {(field.options_json ?? []).map((opt) => {
          const checked = arr.includes(opt.value);
          return (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(checked ? arr.filter((v) => v !== opt.value) : [...arr, opt.value])
                }
                className="h-4 w-4 rounded border-amber-300 text-khatulistiwa-600 focus:ring-khatulistiwa-500"
              />
              <span className="text-sm text-khatulistiwa-800">{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (t === "boolean") {
    const on = Boolean(value);
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Perbaiki ${field.label}`}
        onClick={() => onChange(!on)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-khatulistiwa-400/40",
          on ? "bg-khatulistiwa-600" : "bg-khatulistiwa-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    );
  }

  // Text-like (text/email/number/currency/tel/nik/npwp/phone/geo) + fallback.
  const isNumeric = t === "number" || t === "currency";
  return (
    <input
      id={field.key}
      type={t === "email" ? "email" : isNumeric ? "number" : t === "tel" || t === "phone" ? "tel" : "text"}
      inputMode={t === "nik" || t === "npwp" ? "numeric" : undefined}
      value={value == null ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(isNumeric ? (v === "" ? "" : Number(v)) : v);
      }}
      placeholder={field.validation_json?.placeholder ?? "Perbaiki nilai…"}
      className={inputCls}
      aria-label={`Perbaiki ${field.label}`}
    />
  );
}
