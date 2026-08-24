"""POST /media/upload — validates + streams to the active StorageService."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.deps import get_current_user
from app.models.user import User
from app.services.storage import get_storage_service

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "video/mp4",
    "video/quicktime",
}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB


@router.post("/upload")
async def upload_media(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
) -> dict:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Unsupported file type: {file.content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds the 25MB upload limit.")
    if len(file_bytes) == 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Uploaded file is empty.")

    storage = get_storage_service()
    url = await storage.upload(file_bytes=file_bytes, filename=file.filename or "upload", content_type=file.content_type)
    return {"url": url, "content_type": file.content_type, "size_bytes": len(file_bytes)}
