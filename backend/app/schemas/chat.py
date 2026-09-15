"""Pydantic schemas for the AI chat endpoint."""

from pydantic import BaseModel, Field
import uuid


class ChatRequest(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str = Field(..., min_length=1, max_length=2000)
    language: str = Field(default="en", pattern="^(en|te|hi)$")
    location: str | None = Field(None, description="User's current location context")
    lat: float | None = None
    lon: float | None = None


class WeatherSnapshot(BaseModel):
    location: str
    temperature_c: float
    feels_like_c: float
    humidity_pct: int
    wind_speed_kmh: float
    rain_probability_pct: int
    condition_text: str
    condition_code: int
    is_day: bool = True


class ChatResponse(BaseModel):
    session_id: str
    message: str
    language: str
    weather_data_used: bool
    location_resolved: str | None
    weather_data: WeatherSnapshot | None = None


class ChatHistoryMessage(BaseModel):
    id: str
    role: str
    content: str
    language: str
    created_at: str
    weather_data: WeatherSnapshot | None = None


class LocationSearchResult(BaseModel):
    name: str
    state: str | None
    country: str
    latitude: float
    longitude: float
    display_name: str
