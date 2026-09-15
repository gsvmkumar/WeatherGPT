"""User, UserLocation, and DeviceToken ORM models."""

import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.chat import ChatSession
    from app.models.alert import AlertPreference


class User(Base, UUIDMixin, TimestampMixin):
    """User account model for mobile and web WeatherGPT."""
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False, index=True)  # en | te | hi

    # Relationships
    locations: Mapped[list["UserLocation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    alert_preferences: Mapped[list["AlertPreference"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    device_tokens: Mapped[list["DeviceToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.name} lang={self.preferred_language}>"


class UserLocation(Base, UUIDMixin, TimestampMixin):
    """User-saved favorite or home/work locations."""
    __tablename__ = "user_locations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="locations")
    alert_preferences: Mapped[list["AlertPreference"]] = relationship(
        back_populates="location", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_user_locations_user_default", "user_id", "is_default"),
    )

    def __repr__(self) -> str:
        return f"<UserLocation {self.location_name} user={self.user_id} default={self.is_default}>"


class DeviceToken(Base, UUIDMixin, TimestampMixin):
    """Push notification device tokens for mobile/web devices."""
    __tablename__ = "device_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    push_token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # android | ios | web

    # Relationship
    user: Mapped["User"] = relationship(back_populates="device_tokens")

    def __repr__(self) -> str:
        return f"<DeviceToken platform={self.platform} user={self.user_id}>"
