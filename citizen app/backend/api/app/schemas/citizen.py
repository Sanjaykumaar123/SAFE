"""`GET /api/citizen/home` — one optimized dashboard payload (section 42)
instead of the mobile app firing five separate requests on launch."""
from pydantic import BaseModel

from app.schemas.hazard import HazardOut


class HomeStats(BaseModel):
    nearby_count: int
    critical_count: int
    warning_count: int


class HomeResponse(BaseModel):
    greeting: str
    user_name: str
    city_name: str
    stats: HomeStats
    nearby_hazards: list[HazardOut]
    map_markers: list[HazardOut]
