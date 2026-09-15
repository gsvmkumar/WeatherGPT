"""Pydantic schemas for weather-related API requests and responses."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any


class LocationQuery(BaseModel):
    location: str | None = Field(None, description="City name, e.g. 'Vijayawada'")
    lat: float | None = Field(None, description="Latitude")
    lon: float | None = Field(None, description="Longitude")


class CurrentWeatherResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    timezone: str
    fetched_at: datetime
    temperature_c: float
    feels_like_c: float
    humidity_pct: int
    wind_speed_kmh: float
    wind_direction_deg: int
    condition_code: int
    condition_text: str
    precipitation_mm: float
    rain_probability_pct: int
    is_day: bool


class HourlyForecastItem(BaseModel):
    time: datetime
    temperature_c: float
    humidity_pct: int = 0
    rain_probability_pct: int
    precipitation_mm: float
    wind_speed_kmh: float
    condition_code: int
    condition_text: str
    is_day: bool


class DailyForecastItem(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    humidity_pct: int = 0
    rain_probability_pct: int
    precipitation_sum_mm: float
    wind_speed_max_kmh: float
    condition_code: int
    condition_text: str
    sunrise: str
    sunset: str


class ForecastResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    timezone: str
    hourly: list[HourlyForecastItem]
    daily: list[DailyForecastItem]


class HistoricalWeatherItem(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    temp_mean_c: float
    precipitation_sum_mm: float
    wind_speed_max_kmh: float


class HistoricalWeatherResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    start_date: str
    end_date: str
    data: list[HistoricalWeatherItem]
