"""Pydantic schemas for alerts."""

from pydantic import BaseModel
from datetime import datetime
import uuid


class AlertResponse(BaseModel):
    id: uuid.UUID
    alert_type: str
    severity: str
    title: str
    description: str
    triggered_value: float
    threshold_value: float
    is_active: bool
    created_at: datetime
    expires_at: datetime | None
    location: str | None = None
    reason: str | None = None

    model_config = {"from_attributes": True}


class AlertsListResponse(BaseModel):
    location: str
    total: int
    alerts: list[AlertResponse]
    ai_explanation: str | None = None
