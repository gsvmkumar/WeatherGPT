"""
WeatherGPT — Robust Geocoding Service
Primary: Open-Meteo Geocoding API (Fast, comprehensive coverage for Indian cities, towns, villages, mandals, and districts).
Fallback: Nominatim (OpenStreetMap) with proper User-Agent.
"""

import httpx
import unicodedata
import re
import math
from typing import Any
from tenacity import retry, stop_after_attempt, wait_exponential

from app.utils import cache


OPEN_METEO_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
HEADERS = {"User-Agent": "WeatherGPT/1.0 (hackathon project; contact@weathergpt.local)"}

# Indian State/UT abbreviations map for query qualifier matching
INDIAN_STATES = {
    "ap": "Andhra Pradesh",
    "andhra": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "ts": "Telangana",
    "tg": "Telangana",
    "telangana": "Telangana",
    "tn": "Tamil Nadu",
    "tamil nadu": "Tamil Nadu",
    "ka": "Karnataka",
    "karnataka": "Karnataka",
    "mh": "Maharashtra",
    "maharashtra": "Maharashtra",
    "dl": "Delhi",
    "delhi": "Delhi",
    "up": "Uttar Pradesh",
    "uttar pradesh": "Uttar Pradesh",
    "mp": "Madhya Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "wb": "West Bengal",
    "west bengal": "West Bengal",
    "kl": "Kerala",
    "kerala": "Kerala",
    "gj": "Gujarat",
    "gujarat": "Gujarat",
    "rj": "Rajasthan",
    "rajasthan": "Rajasthan",
    "pb": "Punjab",
    "punjab": "Punjab",
    "hr": "Haryana",
    "haryana": "Haryana",
    "or": "Odisha",
    "odisha": "Odisha",
    "br": "Bihar",
    "bihar": "Bihar",
    "as": "Assam",
    "assam": "Assam",
    "jh": "Jharkhand",
    "jharkhand": "Jharkhand",
    "cg": "Chhattisgarh",
    "chhattisgarh": "Chhattisgarh",
    "uk": "Uttarakhand",
    "uttarakhand": "Uttarakhand",
    "hp": "Himachal Pradesh",
    "himachal pradesh": "Himachal Pradesh",
    "ga": "Goa",
    "goa": "Goa",
}


def normalize_ascii(s: str) -> str:
    """Normalize string to lowercase ASCII without diacritics and extra spaces."""
    if not s:
        return ""
    # Normalize unicode diacritics (e.g. Kākināda -> Kakinada)
    normalized = unicodedata.normalize("NFKD", s)
    ascii_bytes = normalized.encode("ascii", "ignore")
    cleaned = ascii_bytes.decode("utf-8").lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def build_display_name(item: dict[str, Any]) -> str:
    """Format rich, informative display name for disambiguation."""
    parts = []
    name = item.get("name")
    if name:
        parts.append(name)

    admin2 = item.get("admin2")
    if admin2 and admin2.lower() != (name or "").lower():
        parts.append(admin2)

    admin1 = item.get("admin1")
    if admin1 and admin1.lower() != (name or "").lower():
        parts.append(admin1)

    country = item.get("country", "India")
    if country:
        parts.append(country)

    return ", ".join(parts) if parts else name or "Unknown"


def score_result(item: dict[str, Any], query_clean: str, state_hint: str | None = None) -> float:
    """
    Score a candidate location based on relevance to query, country, admin region, and population.
    Returns a score from 0.0 to 200.0+.
    """
    name_clean = normalize_ascii(item.get("name", ""))
    query_norm = normalize_ascii(query_clean)
    score = 0.0

    # 1. Exact string match
    if name_clean == query_norm:
        score += 100.0
    # Exact match with query without spaces (e.g. "tadepalligudem" vs "tadepalli gudem")
    elif name_clean == query_norm.replace(" ", "") or name_clean.replace(" ", "") == query_norm:
        score += 90.0
    elif name_clean.startswith(query_norm):
        score += 60.0
    elif query_norm in name_clean:
        score += 40.0
    elif any(word in name_clean for word in query_norm.split() if len(word) > 2):
        score += 20.0
    else:
        # If no lexical match at all, penalize heavily
        score -= 50.0

    # 2. Country match (India priority)
    country_code = (item.get("country_code") or "").upper()
    country_name = (item.get("country") or "").lower()
    if country_code == "IN" or "india" in country_name:
        score += 50.0

    # 3. State hint match
    if state_hint:
        admin1 = (item.get("admin1") or "").lower()
        if state_hint.lower() in admin1:
            score += 40.0

    # 4. Feature code preference (populated places higher than mountains/streams)
    feature_code = item.get("feature_code", "")
    if feature_code in {"PPLC", "PPLA", "PPLA2", "PPL"}:
        score += 15.0
    elif feature_code.startswith("ADM"):
        score += 10.0

    # 5. Population weighting (logarithmic boost, up to 20 points)
    pop = item.get("population") or 0
    if pop > 0:
        score += min(20.0, math.log10(max(10, pop)) * 3.5)

    return score


async def _fetch_open_meteo_search(name: str, country_code: str | None = "IN", count: int = 10) -> list[dict[str, Any]]:
    """Helper to call Open-Meteo Geocoding API with retry."""
    params: dict[str, Any] = {
        "name": name,
        "count": min(count, 100),
        "language": "en",
        "format": "json",
    }
    if country_code:
        params["country_code"] = country_code

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=12.0) as client:
            resp = await client.get(OPEN_METEO_GEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", []) or []
    except Exception as e:
        return []


async def _fetch_nominatim_search(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Fallback search using Nominatim OpenStreetMap."""
    params = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 1,
        "countrycodes": "in",
    }
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10.0) as client:
            resp = await client.get(NOMINATIM_URL, params=params)
            resp.raise_for_status()
            results = resp.json()
            converted = []
            for r in results:
                addr = r.get("address", {})
                converted.append({
                    "name": addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or r.get("display_name", "").split(",")[0],
                    "admin1": addr.get("state"),
                    "admin2": addr.get("state_district") or addr.get("county"),
                    "country": addr.get("country", "India"),
                    "country_code": "IN",
                    "latitude": float(r["lat"]),
                    "longitude": float(r["lon"]),
                    "display_name": r.get("display_name", query),
                })
            return converted
    except Exception:
        return []


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
async def geocode_location(query: str) -> dict[str, Any] | None:
    """
    Convert a city, town, village, mandal, or district name to exact lat/lon coordinates.
    Implements multi-strategy searching, ranking, rejection of unrelated places, and TTL caching.
    """
    if not query or not query.strip():
        return None

    raw_query = query.strip()
    cache_key = raw_query.lower()

    # ── Step 0: Check memory TTL cache ───────────────────────────────────────
    cached = cache.get_geocode_cache(cache_key)
    if cached:
        return cached

    # Parse potential state qualifier (e.g. "Tadepalligudem, AP" or "Vijayawada, Andhra Pradesh")
    state_hint = None
    clean_search = raw_query
    if "," in raw_query:
        parts = [p.strip() for p in raw_query.split(",")]
        clean_search = parts[0]
        if len(parts) > 1:
            state_cand = parts[1].lower()
            state_hint = INDIAN_STATES.get(state_cand, parts[1])

    # Strip noise words like "district", "city", "mandal", "town"
    stripped_clean = re.sub(r"\b(city|town|village|district|mandal|taluk)\b", "", clean_search, flags=re.IGNORECASE).strip()
    if not stripped_clean:
        stripped_clean = clean_search

    # ── Step 1: Execute search strategies in order ────────────────────────────
    candidate_queries = [
        (clean_search, "IN"),
        (stripped_clean, "IN"),
    ]

    # If query has spaces (e.g. "Tadepalli gudem"), try concatenated "Tadepalligudem"
    if " " in stripped_clean:
        candidate_queries.append(("".join(stripped_clean.split()), "IN"))

    # Also try global search if country filter was too strict
    candidate_queries.append((clean_search, None))

    all_raw_results: list[dict[str, Any]] = []
    seen_ids = set()

    for q_term, country in candidate_queries:
        if not q_term:
            continue
        results = await _fetch_open_meteo_search(name=q_term, country_code=country, count=15)
        for r in results:
            rid = r.get("id", f"{r.get('latitude')}:{r.get('longitude')}")
            if rid not in seen_ids:
                seen_ids.add(rid)
                all_raw_results.append(r)
        if all_raw_results:
            break

    # ── Step 2: Fallback to Nominatim if Open-Meteo had no matches ────────────
    if not all_raw_results:
        all_raw_results = await _fetch_nominatim_search(raw_query, limit=5)

    if not all_raw_results:
        return None

    # ── Step 3: Score and rank results ───────────────────────────────────────
    scored: list[tuple[float, dict[str, Any]]] = []
    for item in all_raw_results:
        s = score_result(item, stripped_clean, state_hint=state_hint)
        # Requirement 5: Reject unrelated matches (must have positive similarity score)
        if s > 25.0:
            scored.append((s, item))

    if not scored:
        return None

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[0][1]

    resolved = {
        "name": best.get("name") or raw_query,
        "state": best.get("admin1"),
        "country": best.get("country", "India"),
        "latitude": float(best["latitude"]),
        "longitude": float(best["longitude"]),
        "display_name": build_display_name(best),
    }

    # Save to TTL cache for fast repeated queries
    cache.set_geocode_cache(cache_key, resolved)
    return resolved


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
async def search_locations(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """
    Search for multiple matching locations with disambiguation.
    Used by the location search bar in the header.
    """
    if not query or not query.strip():
        return []

    clean_query = query.strip()
    # 1. Search Open-Meteo with India filter
    raw_results = await _fetch_open_meteo_search(name=clean_query, country_code="IN", count=max(limit * 2, 10))

    # If spaces in query, also try joined
    if not raw_results and " " in clean_query:
        raw_results = await _fetch_open_meteo_search(name="".join(clean_query.split()), country_code="IN", count=10)

    # If still no results, search global Open-Meteo
    if not raw_results:
        raw_results = await _fetch_open_meteo_search(name=clean_query, country_code=None, count=limit)

    # If still no results, fallback to Nominatim
    if not raw_results:
        raw_results = await _fetch_nominatim_search(clean_query, limit=limit)

    # Score and format
    scored = []
    seen = set()
    for item in raw_results:
        lat = item.get("latitude")
        lon = item.get("longitude")
        key = f"{lat:.3f}:{lon:.3f}"
        if key in seen:
            continue
        seen.add(key)
        s = score_result(item, clean_query)
        if s > 15.0:
            scored.append((s, item))

    scored.sort(key=lambda x: x[0], reverse=True)

    locations = []
    for _, item in scored[:limit]:
        locations.append({
            "name": item.get("name", clean_query),
            "state": item.get("admin1"),
            "country": item.get("country", "India"),
            "latitude": float(item["latitude"]),
            "longitude": float(item["longitude"]),
            "display_name": build_display_name(item),
        })

    return locations


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
async def reverse_geocode(lat: float, lon: float) -> dict[str, Any] | None:
    """Convert lat/lon to a human-readable location name via Nominatim."""
    params = {"lat": lat, "lon": lon, "format": "json", "addressdetails": 1}

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10.0) as client:
            response = await client.get(REVERSE_URL, params=params)
            response.raise_for_status()
            result = response.json()

        if "error" in result:
            return None

        address = result.get("address", {})
        return {
            "name": address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or "Unknown",
            "state": address.get("state"),
            "country": address.get("country", "India"),
            "latitude": lat,
            "longitude": lon,
            "display_name": result.get("display_name", f"{lat:.4f},{lon:.4f}"),
        }
    except Exception:
        return None
