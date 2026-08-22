"""GET /, POST /, DELETE /{id} (saved locations) + GET /search (roads/areas/
landmarks/cities/hazards, debounced from the mobile search bar)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.city import City
from app.models.geo import make_point_wkt
from app.models.hazard import Hazard
from app.models.road import Road
from app.models.saved_location import SavedLocation
from app.models.user import User
from app.schemas.location import LocationSearchResult, SavedLocationCreateRequest, SavedLocationOut

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=list[SavedLocationOut])
async def list_saved_locations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[SavedLocationOut]:
    result = await db.execute(select(SavedLocation).where(SavedLocation.user_id == current_user.id).order_by(SavedLocation.created_at))
    return [SavedLocationOut.model_validate(loc) for loc in result.scalars().all()]


@router.post("/", response_model=SavedLocationOut, status_code=status.HTTP_201_CREATED)
async def create_saved_location(
    payload: SavedLocationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedLocationOut:
    location = SavedLocation(
        user_id=current_user.id,
        label=payload.label,
        custom_label=payload.custom_label,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=make_point_wkt(payload.latitude, payload.longitude),
    )
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return SavedLocationOut.model_validate(location)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_location(
    location_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(SavedLocation).where(SavedLocation.id == location_id))
    location = result.scalar_one_or_none()
    if location is None or location.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Saved location not found.")
    await db.delete(location)
    await db.commit()
    return None


@router.get("/search", response_model=list[LocationSearchResult])
async def search_locations(q: str = Query(..., min_length=2, max_length=120), db: AsyncSession = Depends(get_db)) -> list[LocationSearchResult]:
    """Simple `ILIKE` search across roads/cities/hazard location text —
    enough for a debounced autocomplete without standing up a separate
    geocoding service yet."""
    like = f"%{q}%"
    results: list[LocationSearchResult] = []

    road_rows = await db.execute(select(Road).where(Road.name.ilike(like)).limit(8))
    for road in road_rows.scalars().all():
        results.append(LocationSearchResult(label=road.name, subtitle="Road", latitude=0.0, longitude=0.0, kind="ROAD"))

    city_rows = await db.execute(select(City).where(City.name.ilike(like)).limit(5))
    for city in city_rows.scalars().all():
        results.append(
            LocationSearchResult(
                label=city.name,
                subtitle=city.state,
                latitude=city.center_latitude or 0.0,
                longitude=city.center_longitude or 0.0,
                kind="CITY",
            )
        )

    hazard_rows = await db.execute(select(Hazard).where(Hazard.location_text.ilike(like)).limit(8))
    for hazard in hazard_rows.scalars().all():
        results.append(
            LocationSearchResult(
                label=hazard.location_text,
                subtitle=hazard.road_name,
                latitude=hazard.latitude,
                longitude=hazard.longitude,
                kind="HAZARD",
            )
        )

    return results[:20]
