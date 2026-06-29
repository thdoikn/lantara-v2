"""Celery tasks for async document validation."""

from celery import shared_task


@shared_task(bind=True, max_retries=3)
def validate_document(self, doc_id: str):
    from .models import UploadedDocument

    try:
        doc = UploadedDocument.objects.get(id=doc_id)
    except UploadedDocument.DoesNotExist:
        return

    from .validators import EXTENSION_MIME_MAP, FORBIDDEN_MIME_TYPES

    try:
        # Re-detect MIME from stored bytes (defence in depth: the file is now at
        # rest in object storage; confirm it still matches what we accepted).
        import magic

        doc.file.open("rb")
        mime = magic.from_buffer(doc.file.read(2048), mime=True)
        doc.file.close()
        doc.mime_type = mime

        ext = (
            doc.original_filename.rsplit(".", 1)[-1].lower() if "." in doc.original_filename else ""
        )
        allowed = EXTENSION_MIME_MAP.get(ext, set())

        if mime in FORBIDDEN_MIME_TYPES or mime not in allowed:
            doc.status = UploadedDocument.Status.INVALID
            doc.validation_error = "Konten file tidak sesuai atau tidak diizinkan."
            doc.save(update_fields=["mime_type", "status", "validation_error"])
            return

        # TODO: integrate ClamAV / cloud virus-scan hook here
        doc.status = UploadedDocument.Status.VALID
        doc.save(update_fields=["mime_type", "status"])
    except Exception as exc:
        doc.status = UploadedDocument.Status.INVALID
        doc.validation_error = str(exc)
        doc.save(update_fields=["status", "validation_error"])
