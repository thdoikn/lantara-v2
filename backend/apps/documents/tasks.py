"""Celery tasks for async document validation."""

from celery import shared_task


@shared_task(bind=True, max_retries=3)
def validate_document(self, doc_id: str):
    from .models import UploadedDocument

    try:
        doc = UploadedDocument.objects.get(id=doc_id)
    except UploadedDocument.DoesNotExist:
        return

    try:
        # MIME type detection via python-magic
        import magic

        doc.file.open("rb")
        mime = magic.from_buffer(doc.file.read(2048), mime=True)
        doc.file.close()
        doc.mime_type = mime

        # TODO: integrate ClamAV / cloud virus-scan hook here
        doc.status = UploadedDocument.Status.VALID
        doc.save(update_fields=["mime_type", "status"])
    except Exception as exc:
        doc.status = UploadedDocument.Status.INVALID
        doc.validation_error = str(exc)
        doc.save(update_fields=["status", "validation_error"])
