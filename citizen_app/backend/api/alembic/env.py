from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base

# Import every model so autogenerate can see the full metadata.
import app.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alembic runs synchronously — use the sync (psycopg) URL even though the
# app itself talks to Postgres via asyncpg. Same database, different driver.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)

target_metadata = Base.metadata

# PostGIS owns a handful of its own bookkeeping tables/views in the `public`
# schema (spatial_ref_sys, geometry_columns, geography_columns). They aren't
# part of our metadata and must never be touched by autogenerate/migrations.
POSTGIS_OWNED_OBJECTS = {"spatial_ref_sys", "geometry_columns", "geography_columns"}


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in POSTGIS_OWNED_OBJECTS:
        return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, include_object=include_object)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
