"""
Storage provider factory — the only place code branches on
`settings.STORAGE_PROVIDER`. Everything else (media router, seed script)
imports `get_storage_service()` and never touches a concrete implementation.
"""
from functools import lru_cache

from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local_disk import LocalDiskStorageService
from app.services.storage.s3_compatible import S3CompatibleStorageService


@lru_cache
def get_storage_service() -> StorageService:
    if settings.STORAGE_PROVIDER == "s3":
        return S3CompatibleStorageService()
    return LocalDiskStorageService()
