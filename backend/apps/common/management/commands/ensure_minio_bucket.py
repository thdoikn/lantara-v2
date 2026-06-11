"""
manage.py ensure_minio_bucket

Creates the MinIO/S3 bucket on startup if it doesn't already exist.
Idempotent — safe to run on every container start.
"""
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Create the MinIO storage bucket if it does not exist"

    def handle(self, *args, **options):
        import boto3
        from botocore.exceptions import ClientError

        bucket = settings.AWS_STORAGE_BUCKET_NAME
        endpoint = settings.AWS_S3_ENDPOINT_URL

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
        )

        try:
            s3.head_bucket(Bucket=bucket)
            self.stdout.write(f"Bucket '{bucket}' already exists.")
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("404", "NoSuchBucket"):
                s3.create_bucket(Bucket=bucket)
                # Allow public read for served media (validation PDFs, avatars)
                s3.put_bucket_policy(
                    Bucket=bucket,
                    Policy=f'{{"Version":"2012-10-17","Statement":[{{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::{bucket}/*"}}]}}',
                )
                self.stdout.write(self.style.SUCCESS(f"Bucket '{bucket}' created."))
            else:
                self.stderr.write(f"Could not check bucket: {e}")
