"""Shelter ORM model for Emergency Safe Shelters."""

from sqlalchemy import String, Float, Text, Integer, Index
from sqlalchemy.orm import mapped_column, Mapped
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Shelter(Base, UUIDMixin, TimestampMixin):
    """
    Emergency safe shelters and cyclone/flood relief centers.
    Data is strictly verified and sourced from state disaster management authorities.
    """
    __tablename__ = "shelters"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)

    # Authority and verification tracking
    source: Mapped[str] = mapped_column(String(150), nullable=False)  # e.g. "APSDMA / Revenue Dept"
    source_reference: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "AP-CYC-SHELTER-VJA-01"
    verification_status: Mapped[str] = mapped_column(String(30), default="verified_official", nullable=False, index=True)
    # verified_official | map_listed | unverified

    facility_type: Mapped[str] = mapped_column(String(80), nullable=False)
    # Multi-Purpose Cyclone Shelter | Flood Relief Center | Community Safety Hall

    contact_information: Mapped[str] = mapped_column(String(150), nullable=False)
    # Emergency Helpline numbers

    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_shelters_coordinates", "latitude", "longitude"),
    )

    def __repr__(self) -> str:
        return f"<Shelter {self.name} status={self.verification_status} lat={self.latitude} lon={self.longitude}>"
