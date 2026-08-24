"""
Default storage backend for local development and the demo build — writes
uploaded files under `STORAGE_LOCAL_DIR` and serves them back out from
`STORAGE_LOCAL_BASE_URL` (main.py mounts that directory as static files).

Swap `STORAGE_PROVIDER=s3` in `.env` to switch to real object storage
(Supabase Storage or any S3-compatible endpoint) without touching a single
call site — see `S3CompatibleStorageService`.
"""
import re
import uuid
from pathlib import Path

from app.core.config import settings
from app.services.storage.base import StorageService

_SAFE_EXT = re.compile(r"[^a-zA-Z0-9.]")

# Longest edge for a demoted (grayscale) thumbnail — small enough that
# storing thousands of these costs almost nothing, still legible enough for
# a human reviewing an anomaly to tell what the frame showed.
_DEMOTED_MAX_EDGE = 320
_DEMOTED_JPEG_QUALITY = 60


class LocalDiskStorageService(StorageService):
    def __init__(self) -> None:
        self.root = Path(settings.STORAGE_LOCAL_DIR)
        self.root.mkdir(parents=True, exist_ok=True)
        self.base_url = settings.STORAGE_LOCAL_BASE_URL.rstrip("/")

    async def upload(self, *, file_bytes: bytes, filename: str, content_type: str) -> str:
        ext = Path(filename).suffix
        ext = _SAFE_EXT.sub("", ext)[:10] or ""
        stored_name = f"{uuid.uuid4().hex}{ext}"
        path = self.root / stored_name
        path.write_bytes(file_bytes)
        return f"{self.base_url}/{stored_name}"

    async def delete(self, url: str) -> None:
        name = url.rsplit("/", 1)[-1]
        path = self.root / name
        if path.exists():
            path.unlink()

    async def demote(self, url: str) -> None:
        from io import BytesIO

        from PIL import Image

        name = url.rsplit("/", 1)[-1]
        path = self.root / name
        if not path.exists():
            return

        try:
            with Image.open(path) as img:
                grayscale = img.convert("L")
                grayscale.thumbnail((_DEMOTED_MAX_EDGE, _DEMOTED_MAX_EDGE))
                buffer = BytesIO()
                grayscale.save(buffer, format="JPEG", quality=_DEMOTED_JPEG_QUALITY)
        except Exception:
            # Not a decodable image (or already demoted/corrupt) — leave it
            # alone rather than risk destroying evidence on a bad guess.
            return

        path.write_bytes(buffer.getvalue())
