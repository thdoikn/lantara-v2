"""
Content-based file validation for uploads.

Extension checks alone are trivially bypassed (rename evil.html → doc.pdf), so we
also sniff the real content type with libmagic and confirm it belongs to the
family the declared extension promises. This blocks the classic "malicious file
upload" / polyglot findings: HTML/SVG (stored XSS), scripts, and executables
disguised as permitted document types.
"""

# Extension → set of acceptable detected MIME types. Anything not listed here is
# rejected by content even if the extension is allowed by the requirement config.
EXTENSION_MIME_MAP: dict[str, set[str]] = {
    "pdf": {"application/pdf"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "png": {"image/png"},
    "gif": {"image/gif"},
    "webp": {"image/webp"},
    "doc": {"application/msword", "application/x-ole-storage"},
    "docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",  # OOXML is a zip container; libmagic often reports zip
    },
    "xls": {"application/vnd.ms-excel", "application/x-ole-storage"},
    "xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
    },
}

# Detected MIME types we refuse outright, regardless of the declared extension.
# These can execute or render active content if ever served inline.
FORBIDDEN_MIME_TYPES: set[str] = {
    "text/html",
    "application/xhtml+xml",
    "image/svg+xml",
    "application/x-dosexec",
    "application/x-msdownload",
    "application/x-executable",
    "application/x-elf",
    "application/x-mach-binary",
    "application/x-sh",
    "application/x-shellscript",
    "text/x-shellscript",
    "application/javascript",
    "text/javascript",
    "application/x-php",
    "text/x-php",
}


def detect_mime(file_obj) -> str:
    """Sniff the real MIME type from the file's leading bytes."""
    import magic

    pos = file_obj.tell()
    try:
        file_obj.seek(0)
        head = file_obj.read(2048)
    finally:
        file_obj.seek(pos)
    if isinstance(head, str):
        head = head.encode("utf-8", "ignore")
    return magic.from_buffer(head, mime=True)


def validate_upload_content(file_obj, declared_ext: str) -> tuple[bool, str, str]:
    """
    Returns (is_ok, detected_mime, error_message).

    ``declared_ext`` is the lower-cased extension already permitted by the
    requirement's ``allowed_types``. We confirm the bytes match it.
    """
    detected = detect_mime(file_obj)

    if detected in FORBIDDEN_MIME_TYPES:
        return False, detected, "Jenis konten file tidak diizinkan karena alasan keamanan."

    allowed = EXTENSION_MIME_MAP.get(declared_ext)
    # Unknown extension family — be conservative and reject anything we can't vouch for.
    if allowed is None:
        return False, detected, "Tipe file tidak didukung."

    if detected not in allowed:
        return (
            False,
            detected,
            "Isi file tidak cocok dengan ekstensinya. Unggah file yang valid.",
        )

    return True, detected, ""
