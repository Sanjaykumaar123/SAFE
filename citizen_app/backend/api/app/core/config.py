"""
Centralized environment configuration.

Every other module reads settings from here — nothing reaches into
`os.environ` directly. This is what makes the app "environment-specific"
per the product spec: swap `.env`, nothing else changes.
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEMO_MODE: bool = True
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "SafePath AI — Citizen API"

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://safepath:safepath@localhost:5433/safepath"
    DATABASE_URL_SYNC: str = "postgresql+psycopg://safepath:safepath@localhost:5433/safepath"

    # --- Auth ---
    JWT_SECRET: str = "dev-only-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # --- Storage ---
    STORAGE_PROVIDER: Literal["local", "s3"] = "local"
    STORAGE_LOCAL_DIR: str = "./media"
    STORAGE_LOCAL_BASE_URL: str = "http://localhost:8000/media"
    STORAGE_BUCKET: str = ""
    STORAGE_ENDPOINT: str = ""
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_REGION: str = "auto"

    # --- AI ---
    AI_PROVIDER: Literal["mock", "yolov8"] = "yolov8"
    # Microservice URL of the AI Model API Server (e.g., http://localhost:8001 or deployed AI endpoint)
    AI_SERVER_URL: str = "http://localhost:8001"
    # Path to a YOLO .pt checkpoint, relative to backend/api/ (or absolute).
    AI_MODEL_PATH: str = "app/ml_models/pothole_v2_final.pt"
    # auto | cpu | 0 (CUDA device index) — "auto" picks CUDA if available, else CPU.
    AI_DEVICE: Literal["auto", "cpu", "0"] = "auto"
    AI_DETECTION_CONFIDENCE: float = 0.25
    AI_IOU_THRESHOLD: float = 0.45
    AI_IMAGE_SIZE: int = 640


    # --- CORS ---
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
