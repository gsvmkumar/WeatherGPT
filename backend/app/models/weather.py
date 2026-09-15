"""Weather data and forecast ORM models."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class WeatherData(Base, UUIDMixin):
    """Cached current weather snapshots fetched from the weather API."""
    __tablename__ = "weather_data"

    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    temperature_c: Mapped[float | None] = mapped_column(Float)
    feels_like_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[int | None] = mapped_column(Integer)
    wind_speed_kmh: Mapped[float | None] = mapped_column(Float)
    wind_direction_deg: Mapped[int | None] = mapped_column(Integer)
    condition_code: Mapped[int | None] = mapped_column(Integer)
    condition_text: Mapped[str | None] = mapped_column(String(255))
    precipitation_mm: Mapped[float | None] = mapped_column(Float)
    rain_probability_pct: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict | None] = mapped_column(JSONB)  # Full API response

    location: Mapped["Location"] = relationship(back_populates="weather_data")  # noqa: F821

    __table_args__ = (
        Index("ix_weather_data_location_fetched", "location_id", "fetched_at"),
    )

    def __repr__(self) -> str:
        return f"<WeatherData location={self.location_id} at={self.fetched_at}>"


class Forecast(Base, UUIDMixin):
    """Hourly and daily forecasts stored as flexible JSONB."""
    __tablename__ = "forecasts"

    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    forecast_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'hourly' | 'daily'
    forecast_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    location: Mapped["Location"] = relationship(back_populates="forecasts")  # noqa: F821

    __table_args__ = (
        Index("ix_forecasts_location_type_for", "location_id", "forecast_type", "forecast_for"),
    )

    def __repr__(self) -> str:
        return f"<Forecast {self.forecast_type} location={self.location_id} for={self.forecast_for}>"
