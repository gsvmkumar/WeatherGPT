"""
WeatherGPT Backend — Application Configuration
All settings are loaded from environment variables (via .env file).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ────────────────────────────────────────────────────────────
    # Loaded strictly from DATABASE_URL environment variable (.env)
    database_url: str = ""

    # ── Google Gemini LLM ────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"

    # ── Weather API ──────────────────────────────────────────────────────────
    weather_api_provider: str = "open_meteo"

    # ── Security ─────────────────────────────────────────────────────────────
    secret_key: str = "change-me-to-a-long-random-secret"

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # ── Alert Thresholds ─────────────────────────────────────────────────────
    alert_rain_probability_threshold: int = 70   # %
    alert_temp_high_threshold: float = 40.0      # °C
    alert_wind_speed_threshold: float = 50.0     # km/h
    alert_humidity_threshold: int = 90           # %


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings singleton. Use as a FastAPI dependency."""
    return Settings()
