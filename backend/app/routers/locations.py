"""Locations router — geocoding search endpoint."""

from fastapi import APIRouter, HTTPException, Query
from app.schemas.chat import LocationSearchResult
from app.services import geocoding_service

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/search", response_model=list[LocationSearchResult])
async def search_locations(
    q: str | None = Query(None, min_length=2, description="City or location name to search"),
    query: str | None = Query(None, min_length=2, description="Alias for q"),
    limit: int = Query(5, ge=1, le=10),
):
    """Search for locations by name. Returns up to `limit` matching results."""
    search_term = q or query
    if not search_term:
        raise HTTPException(status_code=400, detail="Query parameter 'q' or 'query' is required")
    results = await geocoding_service.search_locations(search_term, limit=limit)
    if not results:
        raise HTTPException(status_code=404, detail=f"No locations found for '{search_term}'")
    return [LocationSearchResult(**r) for r in results]


@router.get("/reverse", response_model=LocationSearchResult)
async def reverse_geocode_location(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Reverse geocode coordinates to location name via OpenStreetMap/Nominatim."""
    result = await geocoding_service.reverse_geocode(lat, lon)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No location found for coordinates ({lat}, {lon})",
        )
    return LocationSearchResult(**result)
