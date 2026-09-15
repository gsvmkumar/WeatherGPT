"""Location ORM model."""

import uuid
from sqlalchemy import String, Float, Index
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Location(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "locations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(100), default="India")
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), default="Asia/Kolkata")

    # Relationships
    weather_data: Mapped[list["WeatherData"]] = relationship(back_populates="location", cascade="all, delete-orphan")  # noqa: F821
    forecasts: Mapped[list["Forecast"]] = relationship(back_populates="location", cascade="all, delete-orphan")  # noqa: F821
    alerts: Mapped[list["Alert"]] = relationship(back_populates="location", cascade="all, delete-orphan")  # noqa: F821
    advisories: Mapped[list["Advisory"]] = relationship(back_populates="location", cascade="all, delete-orphan")  # noqa: F821

    __table_args__ = (
        Index("ix_locations_name", "name"),
        Index("ix_locations_lat_lon", "latitude", "longitude"),
    )

    def __repr__(self) -> str:
        return f"<Location {self.name}, {self.country}>"
