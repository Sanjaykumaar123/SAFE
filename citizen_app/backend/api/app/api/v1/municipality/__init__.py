"""
Municipality app API surface (section 51) — every route here requires a
`role == MUNICIPALITY` JWT and re-verifies city authorization server-side
(section 04/52/70). Mounted once, as a single `router`, from `app.main`.
"""
from fastapi import APIRouter

from app.api.v1.municipality import analytics, auth, cities, dashboard, hazards, inspections, me, repairs, wards

router = APIRouter(prefix="/municipality")
router.include_router(auth.router)
router.include_router(me.router)
router.include_router(cities.router)
router.include_router(wards.router)
router.include_router(dashboard.router)
router.include_router(hazards.router)
router.include_router(repairs.router)
router.include_router(inspections.router)
router.include_router(analytics.router)
