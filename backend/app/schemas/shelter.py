"""Pydantic schemas for Emergency Safe Shelters."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ShelterResponse(BaseModel):
    id: uuid.UUID
    name: str
    latitude: float
    longitude: float
    address: str
    source: str
    source_reference: str
    verification_status: str  # verified_official | map_listed | unverified
    facility_type: str
    contact_information: str
    capacity: int | None
    distance_km: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SheltersListResponse(BaseModel):
    count: int
    user_latitude: float
    user_longitude: float
    radius_km: float
    shelters: list[ShelterResponse]
    safety_advisory: str
    has_verified_shelters: bool
