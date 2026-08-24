"""
SafePath AI — Citizen backend API entrypoint.

Run locally:
    uvicorn app.main:app --reload

REST today; the module layout (routers/services cleanly separated from
main.py) leaves room to mount a WebSocket router alongside these same
services later for live map updates (section 44) without restructuring.
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1 import ai, auth, citizen, hazards, locations, media, notifications, reports
from app.api.v1 import fleet, municipality
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description=(
        "Citizen-facing REST API for SafePath AI. Serves the citizen mobile "
        "app today; schema and endpoints are shaped to support the Admin, "
        "Municipality, and Fleet Operator apps on the same backend later."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local-disk media (default STORAGE_PROVIDER=local) served back out from
# here. Switching to STORAGE_PROVIDER=s3 makes this mount unused — media
# URLs then point straight at the S3-compatible endpoint instead.
app.mount("/media", StaticFiles(directory=settings.STORAGE_LOCAL_DIR, check_dir=False), name="media")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Normalize FastAPI's default 422 body to a single friendly `detail`
    string so the mobile client's error handling doesn't special-case
    validation errors vs. every other 4xx."""
    first_error = exc.errors()[0] if exc.errors() else None
    message = "Invalid request."
    if first_error:
        field = ".".join(str(loc) for loc in first_error.get("loc", []) if loc != "body")
        message = f"{field}: {first_error.get('msg')}" if field else first_error.get("msg", message)
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": message})


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "environment": settings.ENVIRONMENT, "demo_mode": settings.DEMO_MODE, "ai_provider": settings.AI_PROVIDER}


api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(hazards.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(locations.router, prefix=api_prefix)
app.include_router(media.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)
app.include_router(citizen.router, prefix=api_prefix)
app.include_router(municipality.router, prefix=api_prefix)
app.include_router(fleet.router, prefix=api_prefix)
