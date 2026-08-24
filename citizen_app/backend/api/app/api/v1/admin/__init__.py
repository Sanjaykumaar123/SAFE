from fastapi import APIRouter
from app.api.v1.admin.hazards import router as hazards_router

router = APIRouter()
router.include_router(hazards_router)
