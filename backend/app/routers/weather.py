"""Weather API router — current, forecast, and historical endpoints."""

from fastapi import APIRouter, HTTPException, Query
from datetime import date, timedelta

from app.schemas.weather import CurrentWeatherResponse, ForecastResponse, HistoricalWeatherResponse
from app.services import geocoding_service, weather_service
from app.utils import cache

router = APIRouter(prefix="/api/weather", tags=["weather"])


async def _resolve_location(location: str | None, lat: float | None, lon: float | None):
    """Resolve a location query to (lat, lon, name). Raises 404 if not found."""
    if lat is not None and lon is not None:
        name = f"{lat:.4f},{lon:.4f}"
        return lat, lon, name

    if not location:
        raise HTTPException(status_code=400, detail="Provide either 'location' or 'lat' and 'lon'")

    # Check geocoding cache first
    cached = cache.get_geocode_cache(location)
    if cached:
        return cached["latitude"], cached["longitude"], cached["name"]

    geo = await geocoding_service.geocode_location(location)
    if not geo:
        raise HTTPException(status_code=404, detail=f"Location '{location}' not found")

    cache.set_geocode_cache(location, geo)
    return geo["latitude"], geo["longitude"], geo["name"]


@router.get("/current", response_model=CurrentWeatherResponse)
async def get_current_weather(
    location: str | None = Query(None, description="City name"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
):
    """Get current weather conditions for a location."""
    lat, lon, name = await _resolve_location(location, lat, lon)

    # Check cache
    cached = cache.get_current_weather_cache(lat, lon)
    if cached:
        return cached

    data = await weather_service.fetch_current_weather(lat, lon, name)
    cache.set_current_weather_cache(lat, lon, data)
    return data


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    location: str | None = Query(None),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    days: int = Query(7, ge=1, le=16),
):
    """Get hourly (48h) and daily (up to 16 days) weather forecast."""
    lat, lon, name = await _resolve_location(location, lat, lon)

    cached = cache.get_forecast_cache(lat, lon, days)
    if cached:
        return cached

    data = await weather_service.fetch_forecast(lat, lon, name, days)
    cache.set_forecast_cache(lat, lon, days, data)
    return data


@router.get("/history", response_model=HistoricalWeatherResponse)
async def get_history(
    location: str | None = Query(None),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    start: str = Query(
        default=str(date.today() - timedelta(days=30)),
        description="Start date YYYY-MM-DD",
    ),
    end: str = Query(
        default=str(date.today() - timedelta(days=1)),
        description="End date YYYY-MM-DD (must be before today)",
    ),
):
    """Get historical weather data for a date range."""
    lat, lon, name = await _resolve_location(location, lat, lon)

    # Validate dates
    try:
        s = date.fromisoformat(start)
        e = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    if s >= e:
        raise HTTPException(status_code=400, detail="start must be before end")
    if e >= date.today():
        raise HTTPException(status_code=400, detail="end must be before today (historical data only)")

    return await weather_service.fetch_historical(lat, lon, name, start, end)
