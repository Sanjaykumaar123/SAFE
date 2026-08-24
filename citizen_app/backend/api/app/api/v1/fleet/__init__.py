"""
Fleet Operator app API surface (§65) — every route here requires a
`role == FLEET_OPERATOR` JWT and re-derives operator/vehicle context
server-side (§14/58/59). Mounted once, as a single `router`, from
`app.main` — mirrors `app/api/v1/municipality/__init__.py` exactly.
"""
from fastapi import APIRouter

from app.api.v1.fleet import auth, earnings, me, observations, routes, sessions

router = APIRouter(prefix="/fleet")
router.include_router(auth.router)
router.include_router(me.router)
router.include_router(routes.router)
router.include_router(sessions.router)
router.include_router(observations.router)
router.include_router(earnings.router)
