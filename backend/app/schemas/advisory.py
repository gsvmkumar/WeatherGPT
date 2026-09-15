"""Pydantic schemas for advisories."""

from pydantic import BaseModel
from datetime import datetime
import uuid


class AdvisoryResponse(BaseModel):
    id: uuid.UUID
    category: str
    recommendation: str
    generated_at: datetime

    model_config = {"from_attributes": True}


class AdvisoriesListResponse(BaseModel):
    location: str
    total: int
    advisories: list[AdvisoryResponse]
    ai_explanation: str | None = None
    weather_summary: dict | None = None
