"""
WeatherGPT — In-memory TTL Cache
Simple key-value cache with configurable TTL per entry.
Used to avoid hammering weather APIs on every request.
"""

import time
from typing import Any
from cachetools import TTLCache
import threading


# Default cache sizes and TTLs (seconds)
_current_weather_cache: TTLCache = TTLCache(maxsize=500, ttl=300)   # 5 minutes
_forecast_cache: TTLCache = TTLCache(maxsize=200, ttl=3600)          # 1 hour
_geocode_cache: TTLCache = TTLCache(maxsize=1000, ttl=86400)         # 24 hours

_lock = threading.Lock()


def cache_key(lat: float, lon: float, suffix: str = "") -> str:
    return f"{lat:.4f}:{lon:.4f}:{suffix}"


def get_current_weather_cache(lat: float, lon: float) -> Any | None:
    key = cache_key(lat, lon, "current")
    with _lock:
        return _current_weather_cache.get(key)


def set_current_weather_cache(lat: float, lon: float, data: Any) -> None:
    key = cache_key(lat, lon, "current")
    with _lock:
        _current_weather_cache[key] = data


def get_forecast_cache(lat: float, lon: float, days: int) -> Any | None:
    key = cache_key(lat, lon, f"forecast:{days}")
    with _lock:
        return _forecast_cache.get(key)


def set_forecast_cache(lat: float, lon: float, days: int, data: Any) -> None:
    key = cache_key(lat, lon, f"forecast:{days}")
    with _lock:
        _forecast_cache[key] = data


def get_geocode_cache(query: str) -> Any | None:
    with _lock:
        return _geocode_cache.get(query.lower())


def set_geocode_cache(query: str, data: Any) -> None:
    with _lock:
        _geocode_cache[query.lower()] = data
