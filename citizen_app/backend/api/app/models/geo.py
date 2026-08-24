"""
Small geo helper shared by every model that stores a location.

Each point is stored twice on purpose:
- `location` (PostGIS `Geography(Point, 4326)`) is the source of truth for
  spatial queries (`ST_DWithin`, `ST_Distance` — see app/services/geo.py).
- plain `latitude`/`longitude` floats are kept in sync alongside it so
  reading a row back for a JSON response never requires parsing WKB.
"""
from geoalchemy2 import Geography
from sqlalchemy import Float
from sqlalchemy.orm import Mapped, mapped_column


def geography_point_column():
    # spatial_index=False: GeoAlchemy2 would otherwise register its own
    # `after_create` DDL listener AND leave an Index on the table's
    # metadata, so Alembic autogenerate ends up emitting a second, colliding
    # `CREATE INDEX` for the same column. We instead declare the GIST index
    # explicitly (see the generated migration) as the single source of it.
    return mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False)


def geography_point_column_nullable():
    return mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True)


class LatLngMixin:
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)


def make_point_wkt(latitude: float, longitude: float) -> str:
    """`SRID=4326;POINT(lon lat)` — PostGIS wants (lon, lat) order."""
    return f"SRID=4326;POINT({longitude} {latitude})"
