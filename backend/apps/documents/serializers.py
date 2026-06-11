from rest_framework import serializers
from .models import UploadedDocument


class UploadedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedDocument
        fields = [
            "id", "requirement_key", "requirement_title",
            "original_filename", "mime_type", "file_size",
            "status", "validation_error", "is_active",
            "revision_round", "created_at",
        ]
        read_only_fields = [
            "id", "mime_type", "file_size", "status",
            "validation_error", "checksum_sha256", "created_at",
        ]


class DocumentUploadSerializer(serializers.Serializer):
    requirement_key = serializers.SlugField()
    file = serializers.FileField()
