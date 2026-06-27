"""Type-aware validation of submission form_data.

Mirrors the client-side zod rules in frontend DynamicForm so submitted data is
clean even when the API is called directly (bypassing the SPA). Driven by each
field's ``field_type`` plus the ``validation_json`` keys already present in the
seeds (length/minLength/maxLength/min/max/pattern). Messages are Indonesian to
match the rest of the applicant UI.
"""

import re

NIK_RE = re.compile(r"^\d{16}$")
NPWP_RE = re.compile(r"^\d{15,16}$")
# Indonesian mobile only: 08xx / 628xx / +628xx
PHONE_RE = re.compile(r"^(?:\+?62|0)8\d{8,11}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _digits(value) -> str:
    return re.sub(r"\D", "", str(value))


def _option_values(field: dict) -> set:
    return {
        str(o.get("value"))
        for o in (field.get("options_json") or [])
        if isinstance(o, dict)
    }


def validate_field_value(field: dict, value) -> str | None:
    """Return an Indonesian error message, or None if the value is acceptable.

    Empty values pass here — required-ness is enforced separately. Unknown field
    types are a no-op so the engine can add types without breaking submissions.
    """
    ftype = field.get("field_type")
    vj = field.get("validation_json") or {}
    label = field.get("label") or field.get("key") or "Isian"

    # Empty → skip (required handled by the caller).
    if value is None or value == "" or value == []:
        return None

    if ftype == "nik":
        expected = vj.get("length", 16)
        digits = _digits(value)
        if len(digits) != expected or not digits.isdigit():
            return f"NIK harus {expected} digit angka"
        return None

    if ftype == "npwp":
        if not NPWP_RE.match(_digits(value)):
            return "NPWP harus 15 atau 16 digit angka"
        return None

    if ftype == "phone":
        cleaned = re.sub(r"[^\d+]", "", str(value))
        if not PHONE_RE.match(cleaned):
            return "Nomor HP tidak valid (contoh: 081234567890)"
        return None

    if ftype == "email":
        if not EMAIL_RE.match(str(value)):
            return "Format email tidak valid"
        return None

    if ftype == "number":
        try:
            num = float(value)
        except (TypeError, ValueError):
            return "Harus berupa angka"
        if "min" in vj and num < vj["min"]:
            return f"Nilai minimal {vj['min']}"
        if "max" in vj and num > vj["max"]:
            return f"Nilai maksimal {vj['max']}"
        return None

    if ftype == "select":
        opts = _option_values(field)
        if opts and str(value) not in opts:
            return "Pilihan tidak valid"
        return None

    if ftype == "multiselect":
        if not isinstance(value, list):
            return "Format pilihan tidak valid"
        opts = _option_values(field)
        if opts and any(str(v) not in opts for v in value):
            return "Pilihan tidak valid"
        return None

    if ftype in ("geo", "map_point"):
        parts = str(value).split(",")
        if len(parts) != 2:
            return "Format koordinat tidak valid (mis. -6.2,106.8)"
        try:
            lat, lng = float(parts[0]), float(parts[1])
        except ValueError:
            return "Format koordinat tidak valid (mis. -6.2,106.8)"
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return "Koordinat di luar jangkauan yang valid"
        return None

    # text / textarea / anything string-like: length + pattern rules
    s = str(value)
    if "length" in vj and len(s) != vj["length"]:
        return f"{label} harus {vj['length']} karakter"
    if "minLength" in vj and len(s) < vj["minLength"]:
        return f"Minimal {vj['minLength']} karakter"
    if "maxLength" in vj and len(s) > vj["maxLength"]:
        return f"Maksimal {vj['maxLength']} karakter"
    if vj.get("pattern"):
        try:
            if not re.match(vj["pattern"], s):
                return vj.get("patternMessage", "Format tidak valid")
        except re.error:
            pass  # a malformed admin pattern shouldn't block submissions
    return None


def validate_form_data(fields: list[dict], form_data: dict, only_keys=None) -> dict:
    """Validate provided values against their field definitions.

    ``fields`` are serialized/snapshot field dicts. ``only_keys`` (optional)
    restricts validation to a subset (e.g. just the fields changed on resubmit).
    Returns ``{field_key: message}`` for every invalid value.
    """
    errors: dict[str, str] = {}
    for field in fields:
        key = field.get("key")
        if not key or key not in form_data:
            continue
        if only_keys is not None and key not in only_keys:
            continue
        msg = validate_field_value(field, form_data.get(key))
        if msg:
            errors[key] = msg
    return errors
