"""
Shared geospatial query helpers — the only place raw PostGIS functions
(`ST_DWithin`, `ST_Distance`) are called from. `GET /hazards/nearby` and the
home dashboard both go through here so "search the whole city, then filter
in the app" never happens (section 27/43).
"""
from sqlalchemy import Float, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement

from app.models.enums import ACTIVE_HAZARD_STATUSES, HazardStatus, Severity
from app.models.hazard import Hazard


def geography_origin(latitude: float, longitude: float) -> ColumnElement:
    """
    A `Geography` SQL expression built from plain floats. Use this — never
    an already-fetched ORM row's `.location` attribute — as the "other"
    point in a fresh query: GeoAlchemy2's `WKBElement` (what you get back
    from reading a `Geography` column) doesn't implement `__clause_element__`,
    so passing it straight into another `func.ST_...()` call binds as an
    untyped/unencodable parameter instead of a geography value. Every model
    with a location keeps plain `latitude`/`longitude` floats in sync
    alongside its `Geography` column specifically so this is always
    available (see `app/models/geo.py::LatLngMixin`).
    """
    return func.ST_GeogFromText(f"SRID=4326;POINT({longitude} {latitude})")


def distance_meters_expr(latitude: float, longitude: float) -> ColumnElement:
    origin = geography_origin(latitude, longitude)
    return cast(func.ST_Distance(Hazard.location, origin), Float)


async def query_nearby_hazards(
    db: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    radius_meters: float = 5000,
    severity: Severity | None = None,
    status: HazardStatus | None = None,
    limit: int = 100,
) -> list[tuple[Hazard, float]]:
    """Returns (Hazard, distance_meters) ordered nearest-first, using a real
    PostGIS `ST_DWithin` radius filter — never a full table scan."""
    origin = func.ST_GeogFromText(f"SRID=4326;POINT({longitude} {latitude})")
    distance = cast(func.ST_Distance(Hazard.location, origin), Float)

    stmt = select(Hazard, distance.label("distance_meters")).where(
        func.ST_DWithin(Hazard.location, origin, radius_meters)
    )

    if status is not None:
        stmt = stmt.where(Hazard.status == status)
    else:
        stmt = stmt.where(Hazard.status.in_(ACTIVE_HAZARD_STATUSES))

    if severity is not None:
        stmt = stmt.where(Hazard.severity == severity)

    stmt = stmt.order_by(distance.asc()).limit(limit)

    result = await db.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


def bbox_filter(north: float, south: float, east: float, west: float) -> ColumnElement:
    """
    A real PostGIS viewport filter for the Municipality live map (section
    18/79) — `ST_MakeEnvelope` + `&&` (bounding-box overlap, index-friendly)
    intersected with `ST_Within` for an exact filter. Handles the
    antimeridian-crossing case (`west > east`) by splitting into two
    envelopes; Chennai/Coimbatore/Madurai never need this, but a bbox
    helper that silently returns wrong results at +/-180 is a landmine we'd
    rather not leave for a future city.
    """
    # `ST_AsBinary`/`ST_GeomFromWKB` strips the SRID (Geography -> Geometry
    # with SRID 0), which then fails `ST_Within` against an SRID-4326
    # envelope with "Operation on mixed SRID geometries" — `ST_SetSRID`
    # re-tags it (a metadata-only op; the coordinates are still lon/lat
    # degrees either way, so this is not a reprojection).
    geom = func.ST_SetSRID(func.ST_GeomFromWKB(func.ST_AsBinary(Hazard.location)), 4326)
    if west <= east:
        envelope = func.ST_MakeEnvelope(west, south, east, north, 4326)
        return func.ST_Within(geom, envelope)
    envelope_a = func.ST_MakeEnvelope(west, south, 180, north, 4326)
    envelope_b = func.ST_MakeEnvelope(-180, south, east, north, 4326)
    return func.ST_Within(geom, envelope_a) | func.ST_Within(geom, envelope_b)
