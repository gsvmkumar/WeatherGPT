"""Alerts router — generates and returns weather alerts for a location."""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone

import uuid
from app.schemas.alert import AlertsListResponse, AlertResponse
from app.services import geocoding_service, weather_service, llm_service
from app.services.alert_engine import evaluate_alerts
from app.utils import cache

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertsListResponse)
async def get_alerts(
    location: str | None = Query(None),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    language: str = Query("en", description="en | te"),
):
    """
    Get active weather alerts for a location.
    Fetches verified weather, runs deterministic alert engine, and attaches Gemini safety explanation.
    """
    # Resolve location
    if lat is not None and lon is not None:
        name = f"{lat:.4f},{lon:.4f}"
    elif location:
        cached_geo = cache.get_geocode_cache(location)
        if cached_geo:
            lat, lon, name = cached_geo["latitude"], cached_geo["longitude"], cached_geo["name"]
        else:
            geo = await geocoding_service.geocode_location(location)
            if not geo:
                raise HTTPException(status_code=404, detail=f"Location '{location}' not found")
            cache.set_geocode_cache(location, geo)
            lat, lon, name = geo["latitude"], geo["longitude"], geo["name"]
    else:
        raise HTTPException(status_code=400, detail="Provide 'location' or 'lat' and 'lon'")

    # Fetch current weather
    weather = cache.get_current_weather_cache(lat, lon)
    if not weather:
        weather = await weather_service.fetch_current_weather(lat, lon, name)
        cache.set_current_weather_cache(lat, lon, weather)

    weather_dict = weather.model_dump() if hasattr(weather, "model_dump") else weather

    # Run alert engine with verified location name
    raw_alerts = evaluate_alerts(weather_dict, location_name=name)

    alert_responses = []
    for a in raw_alerts:
        alert_responses.append(AlertResponse(
            id=uuid.uuid4(),
            alert_type=a["alert_type"],
            severity=a["severity"],
            title=a["title"],
            description=a["description"],
            triggered_value=a["triggered_value"],
            threshold_value=a["threshold_value"],
            location=a.get("location", name),
            reason=a.get("reason"),
            is_active=True,
            created_at=datetime.now(timezone.utc),
            expires_at=a.get("expires_at"),
        ))

    # Generate Gemini explanation strictly grounded in active alerts & weather data
    ai_explanation: str | None = None
    try:
        weather_summary = {
            "location": name,
            "temperature_c": weather_dict.get("temperature_c"),
            "humidity_pct": weather_dict.get("humidity_pct"),
            "wind_speed_kmh": weather_dict.get("wind_speed_kmh"),
            "rain_probability_pct": weather_dict.get("rain_probability_pct"),
            "precipitation_mm": weather_dict.get("precipitation_mm"),
            "condition": weather_dict.get("condition_text"),
        }
        ai_explanation = await llm_service.generate_alerts_explanation(
            alerts=raw_alerts,
            weather_summary=weather_summary,
            location=name,
            language=language,
        )
    except Exception as e:
        print(f"[Alerts Router] Gemini explanation error: {e}")

    return AlertsListResponse(
        location=name,
        total=len(alert_responses),
        alerts=alert_responses,
        ai_explanation=ai_explanation,
    )
