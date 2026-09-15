"""Advisories router — generates weather-based advisories for a location."""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
import uuid

from app.schemas.advisory import AdvisoriesListResponse, AdvisoryResponse
from app.services import geocoding_service, weather_service, llm_service
from app.services.advisory_engine import generate_advisories
from app.utils import cache

router = APIRouter(prefix="/api/advisories", tags=["advisories"])

VALID_CATEGORIES = {"agriculture", "travel", "outdoor", "general"}


@router.get("", response_model=AdvisoriesListResponse)
async def get_advisories(
    location: str | None = Query(None),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    category: str | None = Query(None, description="agriculture | travel | outdoor | general"),
    language: str = Query("en", description="en | te"),
):
    """
    Get weather-based advisories for a location.
    Uses current weather data + rule engine to generate recommendations,
    followed by Gemini for natural-language explanation strictly grounded in those rules.
    """
    # Validate category
    if category and category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}"
        )

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

    # Generate deterministic rule-based advisories
    categories = [category] if category else None
    raw_advisories = generate_advisories(weather_dict, categories)

    advisory_responses = [
        AdvisoryResponse(
            id=uuid.uuid4(),
            category=a["category"],
            recommendation=a["recommendation"],
            generated_at=datetime.now(timezone.utc),
        )
        for a in raw_advisories
    ]

    # Generate Gemini explanation strictly grounded in deterministic rules
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
        ai_explanation = await llm_service.generate_advisory_response(
            advisory_rules=raw_advisories,
            weather_summary=weather_summary,
            category=category or "agricultural and outdoor weather",
            language=language,
        )
    except Exception as e:
        print(f"[Advisories Router] Gemini explanation error: {e}")

    return AdvisoriesListResponse(
        location=name,
        total=len(advisory_responses),
        advisories=advisory_responses,
        ai_explanation=ai_explanation,
        weather_summary=weather_dict,
    )
