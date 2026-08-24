"""
S3-compatible storage (works with real AWS S3 or Supabase Storage's S3
interface). Fully implemented and ready to use — just point `.env` at real
credentials and flip `STORAGE_PROVIDER=s3`. Unused by default because no
bucket/credentials exist in this environment yet.
"""
import uuid
from pathlib import Path

import boto3
from botocore.client import Config as BotoConfig

from app.core.config import settings
from app.services.storage.base import StorageError, StorageService


class S3CompatibleStorageService(StorageService):
    def __init__(self) -> None:
        if not (settings.STORAGE_BUCKET and settings.STORAGE_ENDPOINT and settings.STORAGE_ACCESS_KEY):
            raise StorageError(
                "STORAGE_PROVIDER=s3 requires STORAGE_BUCKET, STORAGE_ENDPOINT, "
                "STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY to be set."
            )
        self.bucket = settings.STORAGE_BUCKET
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )

    async def upload(self, *, file_bytes: bytes, filename: str, content_type: str) -> str:
        ext = Path(filename).suffix
        key = f"uploads/{uuid.uuid4().hex}{ext}"
        self._client.put_object(Bucket=self.bucket, Key=key, Body=file_bytes, ContentType=content_type)
        return f"{settings.STORAGE_ENDPOINT.rstrip('/')}/{self.bucket}/{key}"

    async def delete(self, url: str) -> None:
        key = url.split(f"/{self.bucket}/", 1)[-1]
        self._client.delete_object(Bucket=self.bucket, Key=key)

    async def demote(self, url: str) -> None:
        from io import BytesIO

        from PIL import Image

        from app.services.storage.local_disk import _DEMOTED_JPEG_QUALITY, _DEMOTED_MAX_EDGE

        key = url.split(f"/{self.bucket}/", 1)[-1]
        try:
            obj = self._client.get_object(Bucket=self.bucket, Key=key)
            with Image.open(BytesIO(obj["Body"].read())) as img:
                grayscale = img.convert("L")
                grayscale.thumbnail((_DEMOTED_MAX_EDGE, _DEMOTED_MAX_EDGE))
                buffer = BytesIO()
                grayscale.save(buffer, format="JPEG", quality=_DEMOTED_JPEG_QUALITY)
        except Exception:
            # Missing/not-decodable/already-demoted — leave it alone rather
            # than risk destroying evidence on a bad guess.
            return

        self._client.put_object(Bucket=self.bucket, Key=key, Body=buffer.getvalue(), ContentType="image/jpeg")
