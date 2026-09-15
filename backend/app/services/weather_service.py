"""
WeatherGPT — Open-Meteo Weather Service
Fetches current weather, forecasts, and historical data.
No API key required.
"""

import httpx
from datetime import datetime, timezone, timedelta
from typing import Any
from tenacity import retry, stop_after_attempt, wait_exponential

from app.schemas.weather import (
    CurrentWeatherResponse,
    ForecastResponse,
    HourlyForecastItem,
    DailyForecastItem,
    HistoricalWeatherResponse,
    HistoricalWeatherItem,
)


BASE_URL = "https://api.open-meteo.com/v1"
HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive"


# WMO Weather Code → human-readable description
WMO_CODES: dict[int, str] = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}


def wmo_description(code: int) -> str:
    return WMO_CODES.get(code, "Unknown")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def fetch_current_weather(lat: float, lon: float, location_name: str) -> CurrentWeatherResponse:
    """Fetch current weather conditions from Open-Meteo."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m", "apparent_temperature", "relative_humidity_2m",
            "wind_speed_10m", "wind_direction_10m", "weather_code",
            "precipitation", "precipitation_probability", "is_day",
        ],
        "wind_speed_unit": "kmh",
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{BASE_URL}/forecast", params=params)
        response.raise_for_status()
        data = response.json()

    current = data["current"]
    code = current.get("weather_code", 0)

    return CurrentWeatherResponse(
        location=location_name,
        latitude=lat,
        longitude=lon,
        timezone=data.get("timezone", "UTC"),
        fetched_at=datetime.now(timezone.utc),
        temperature_c=current.get("temperature_2m", 0.0),
        feels_like_c=current.get("apparent_temperature", 0.0),
        humidity_pct=current.get("relative_humidity_2m", 0),
        wind_speed_kmh=current.get("wind_speed_10m", 0.0),
        wind_direction_deg=current.get("wind_direction_10m", 0),
        condition_code=code,
        condition_text=wmo_description(code),
        precipitation_mm=current.get("precipitation", 0.0),
        rain_probability_pct=current.get("precipitation_probability", 0),
        is_day=bool(current.get("is_day", 1)),
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def fetch_forecast(lat: float, lon: float, location_name: str, days: int = 7) -> ForecastResponse:
    """Fetch hourly (next 48h) and daily (up to 16 days) forecast from Open-Meteo."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m", "relative_humidity_2m", "precipitation_probability", "precipitation",
            "wind_speed_10m", "weather_code", "is_day",
        ],
        "daily": [
            "temperature_2m_max", "temperature_2m_min",
            "precipitation_probability_max", "precipitation_sum",
            "wind_speed_10m_max", "weather_code", "sunrise", "sunset",
        ],
        "forecast_days": min(days, 16),
        "wind_speed_unit": "kmh",
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{BASE_URL}/forecast", params=params)
        response.raise_for_status()
        data = response.json()

    # Parse hourly (next 48 hours only)
    hourly_raw = data.get("hourly", {})
    hourly_times = hourly_raw.get("time", [])[:48]
    hourly_items = []
    for i, t in enumerate(hourly_times):
        code = hourly_raw.get("weather_code", [])[i] if i < len(hourly_raw.get("weather_code", [])) else 0
        hourly_items.append(HourlyForecastItem(
            time=datetime.fromisoformat(t),
            temperature_c=_safe_get(hourly_raw, "temperature_2m", i),
            humidity_pct=int(_safe_get(hourly_raw, "relative_humidity_2m", i, default=0)),
            rain_probability_pct=int(_safe_get(hourly_raw, "precipitation_probability", i)),
            precipitation_mm=_safe_get(hourly_raw, "precipitation", i),
            wind_speed_kmh=_safe_get(hourly_raw, "wind_speed_10m", i),
            condition_code=code,
            condition_text=wmo_description(code),
            is_day=bool(_safe_get(hourly_raw, "is_day", i)),
        ))

    # Parse daily
    daily_raw = data.get("daily", {})
    daily_times = daily_raw.get("time", [])
    all_hourly_humidity = hourly_raw.get("relative_humidity_2m", [])
    daily_items = []
    for i, t in enumerate(daily_times):
        code = daily_raw.get("weather_code", [])[i] if i < len(daily_raw.get("weather_code", [])) else 0
        day_hums = all_hourly_humidity[i * 24 : (i + 1) * 24]
        avg_hum = int(sum(day_hums) / len(day_hums)) if day_hums else 0
        daily_items.append(DailyForecastItem(
            date=t,
            temp_max_c=_safe_get(daily_raw, "temperature_2m_max", i),
            temp_min_c=_safe_get(daily_raw, "temperature_2m_min", i),
            humidity_pct=avg_hum,
            rain_probability_pct=int(_safe_get(daily_raw, "precipitation_probability_max", i)),
            precipitation_sum_mm=_safe_get(daily_raw, "precipitation_sum", i),
            wind_speed_max_kmh=_safe_get(daily_raw, "wind_speed_10m_max", i),
            condition_code=code,
            condition_text=wmo_description(code),
            sunrise=_safe_get(daily_raw, "sunrise", i, default=""),
            sunset=_safe_get(daily_raw, "sunset", i, default=""),
        ))

    return ForecastResponse(
        location=location_name,
        latitude=lat,
        longitude=lon,
        timezone=data.get("timezone", "UTC"),
        hourly=hourly_items,
        daily=daily_items,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def fetch_historical(
    lat: float, lon: float, location_name: str,
    start_date: str, end_date: str
) -> HistoricalWeatherResponse:
    """Fetch historical daily weather from Open-Meteo Archive API."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": [
            "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
            "precipitation_sum", "wind_speed_10m_max",
        ],
        "wind_speed_unit": "kmh",
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(HISTORICAL_URL, params=params)
        response.raise_for_status()
        data = response.json()

    daily_raw = data.get("daily", {})
    dates = daily_raw.get("time", [])
    items = []
    for i, date in enumerate(dates):
        items.append(HistoricalWeatherItem(
            date=date,
            temp_max_c=_safe_get(daily_raw, "temperature_2m_max", i),
            temp_min_c=_safe_get(daily_raw, "temperature_2m_min", i),
            temp_mean_c=_safe_get(daily_raw, "temperature_2m_mean", i),
            precipitation_sum_mm=_safe_get(daily_raw, "precipitation_sum", i),
            wind_speed_max_kmh=_safe_get(daily_raw, "wind_speed_10m_max", i),
        ))

    return HistoricalWeatherResponse(
        location=location_name,
        latitude=lat,
        longitude=lon,
        start_date=start_date,
        end_date=end_date,
        data=items,
    )


def _safe_get(d: dict, key: str, index: int, default: Any = 0.0) -> Any:
    """Safely retrieve an element from a list inside a dict."""
    lst = d.get(key, [])
    if index < len(lst) and lst[index] is not None:
        return lst[index]
    return default
