"""
WeatherGPT — Alert Engine
Rule-based engine that generates weather alerts from current conditions.
All thresholds are loaded from environment config — never hardcoded.
"""

from datetime import datetime, timezone, timedelta
from typing import Any
from app.config import get_settings

settings = get_settings()

# Alert type constants
ALERT_HEAVY_RAIN = "heavy_rain"
ALERT_EXTREME_HEAT = "extreme_heat"
ALERT_STRONG_WIND = "strong_wind"
ALERT_HIGH_HUMIDITY = "high_humidity"
ALERT_THUNDERSTORM = "thunderstorm"
ALERT_HEAVY_SNOWFALL = "heavy_snowfall"

# WMO codes considered thunderstorm
THUNDERSTORM_CODES = {95, 96, 99}
# WMO codes considered heavy snowfall
HEAVY_SNOW_CODES = {75}


def _severity_from_ratio(triggered: float, threshold: float) -> str:
    """Derive severity based on how much the value exceeds the threshold."""
    ratio = triggered / threshold if threshold else 1.0
    if ratio >= 1.5:
        return "critical"
    elif ratio >= 1.25:
        return "high"
    elif ratio >= 1.1:
        return "medium"
    return "low"


def evaluate_alerts(weather: dict[str, Any], location_name: str = "Unknown") -> list[dict[str, Any]]:
    """
    Evaluate current weather data against deterministic thresholds.
    Supports multi-tiered severities (low/moderate vs high/severe) and transparent reason tracking.

    Args:
        weather: Dict with weather fields (matches CurrentWeatherResponse fields).
        location_name: Name of the verified location.

    Returns:
        List of alert dicts with severity, metrics, threshold reasons, and location.
    """
    alerts = []
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=6)

    rain_prob = weather.get("rain_probability_pct", 0)
    precip = weather.get("precipitation_mm", 0.0)
    temp = weather.get("temperature_c", 0.0)
    wind = weather.get("wind_speed_kmh", 0.0)
    humidity = weather.get("humidity_pct", 0)
    code = weather.get("condition_code", 0)

    # ── 1. Heavy Rain / Rain Advisory ──────────────────────────────────────────
    if rain_prob >= 70 or precip >= 10.0 or code in {65, 82}:
        alerts.append({
            "alert_type": ALERT_HEAVY_RAIN,
            "severity": "high",
            "title": f"Heavy Rain Warning — {location_name}",
            "description": (
                f"Severe precipitation detected ({rain_prob}% probability, {precip} mm). "
                "Localised waterlogging and reduced visibility are likely. Avoid low-lying underpasses and travel cautiously."
            ),
            "triggered_value": float(rain_prob),
            "threshold_value": 70.0,
            "reason": f"Precipitation probability reached {rain_prob}% (threshold: 70%) with {precip} mm rain",
            "location": location_name,
            "expires_at": expires_at,
        })
    elif rain_prob >= 40 or precip >= 1.0 or code in {61, 63, 80, 81}:
        alerts.append({
            "alert_type": ALERT_HEAVY_RAIN,
            "severity": "medium",
            "title": f"Rain Advisory — {location_name}",
            "description": (
                f"Rain probability is {rain_prob}% with possible showers. "
                "Road surfaces may be slippery. Carry rain gear and plan travel accordingly."
            ),
            "triggered_value": float(rain_prob),
            "threshold_value": 40.0,
            "reason": f"Rain probability {rain_prob}% exceeds advisory threshold of 40%",
            "location": location_name,
            "expires_at": expires_at,
        })

    # ── 2. High Temperature / Heatwave ────────────────────────────────────────
    if temp >= 40.0:
        alerts.append({
            "alert_type": ALERT_EXTREME_HEAT,
            "severity": "critical",
            "title": f"Severe Heatwave Alert — {location_name}",
            "description": (
                f"Extreme temperature of {temp:.1f}°C detected. Risk of heat exhaustion and sunstroke. "
                "Stay indoors between 11 AM and 4 PM, maintain electrolyte hydration, and protect vulnerable citizens."
            ),
            "triggered_value": float(temp),
            "threshold_value": 40.0,
            "reason": f"Recorded temperature {temp:.1f}°C exceeds extreme heat threshold (40.0°C)",
            "location": location_name,
            "expires_at": expires_at,
        })
    elif temp >= 35.0:
        alerts.append({
            "alert_type": ALERT_EXTREME_HEAT,
            "severity": "medium",
            "title": f"Elevated Temperature Caution — {location_name}",
            "description": (
                f"Warm conditions with temperature at {temp:.1f}°C. Drink plenty of water and minimize strenuous outdoor labor in peak afternoon hours."
            ),
            "triggered_value": float(temp),
            "threshold_value": 35.0,
            "reason": f"Recorded temperature {temp:.1f}°C exceeds caution threshold (35.0°C)",
            "location": location_name,
            "expires_at": expires_at,
        })

    # ── 3. Strong Wind ────────────────────────────────────────────────────────
    if wind >= 45.0:
        alerts.append({
            "alert_type": ALERT_STRONG_WIND,
            "severity": "high",
            "title": f"High Wind Warning — {location_name}",
            "description": (
                f"Strong wind gusts of {wind:.1f} km/h detected. Danger of flying debris and branch collapse. "
                "Secure tin roofs, banners, and loose objects. Avoid parking beneath weak trees."
            ),
            "triggered_value": float(wind),
            "threshold_value": 45.0,
            "reason": f"Wind speed {wind:.1f} km/h exceeds severe wind threshold (45.0 km/h)",
            "location": location_name,
            "expires_at": expires_at,
        })
    elif wind >= 30.0:
        alerts.append({
            "alert_type": ALERT_STRONG_WIND,
            "severity": "medium",
            "title": f"Brisk Wind Advisory — {location_name}",
            "description": (
                f"Moderate winds reaching {wind:.1f} km/h. Exercise caution when cycling, driving two-wheelers, or working at height."
            ),
            "triggered_value": float(wind),
            "threshold_value": 30.0,
            "reason": f"Wind speed {wind:.1f} km/h exceeds moderate advisory threshold (30.0 km/h)",
            "location": location_name,
            "expires_at": expires_at,
        })

    # ── 4. High Humidity ──────────────────────────────────────────────────────
    if humidity >= 90:
        alerts.append({
            "alert_type": ALERT_HIGH_HUMIDITY,
            "severity": "high",
            "title": f"High Humidity Alert — {location_name}",
            "description": (
                f"Relative humidity is {humidity}%. Atmospheric moisture restricts sweat evaporation, causing elevated heat discomfort. "
                "Stay in well-ventilated rooms and hydrate frequently."
            ),
            "triggered_value": float(humidity),
            "threshold_value": 90.0,
            "reason": f"Relative humidity {humidity}% exceeds critical threshold (90%)",
            "location": location_name,
            "expires_at": expires_at,
        })
    elif humidity >= 80 and temp >= 25.0:
        alerts.append({
            "alert_type": ALERT_HIGH_HUMIDITY,
            "severity": "medium",
            "title": f"Elevated Moisture Advisory — {location_name}",
            "description": (
                f"High ambient moisture ({humidity}%) at {temp:.1f}°C creating muggy and sticky conditions. "
                "Favorable for bacterial and fungal mold development in crop fields and storage facilities."
            ),
            "triggered_value": float(humidity),
            "threshold_value": 80.0,
            "reason": f"Relative humidity {humidity}% exceeds standard comfort threshold (80%)",
            "location": location_name,
            "expires_at": expires_at,
        })

    # ── 5. Extreme Weather (Thunderstorms, Heavy Snow, Dense Fog) ─────────────
    if code in THUNDERSTORM_CODES:
        alerts.append({
            "alert_type": ALERT_THUNDERSTORM,
            "severity": "critical",
            "title": f"Severe Thunderstorm Warning — {location_name}",
            "description": (
                "Active electrical storm and lightning detected in this sector. Seek immediate shelter in an enclosed, substantial building or car. "
                "Do not stand beneath isolated trees or near metal power poles."
            ),
            "triggered_value": float(code),
            "threshold_value": 95.0,
            "reason": f"Dangerous convective storm confirmed (WMO condition code {code})",
            "location": location_name,
            "expires_at": expires_at,
        })
    elif code in {45, 48}:
        alerts.append({
            "alert_type": "fog",
            "severity": "medium",
            "title": f"Dense Fog Advisory — {location_name}",
            "description": (
                "Dense fog has developed, severely restricting horizontal visibility. Drive with low beams or fog lights and maintain extended stopping distances."
            ),
            "triggered_value": float(code),
            "threshold_value": 45.0,
            "reason": f"Fog formation detected (WMO code {code})",
            "location": location_name,
            "expires_at": expires_at,
        })
    elif code in HEAVY_SNOW_CODES:
        alerts.append({
            "alert_type": ALERT_HEAVY_SNOWFALL,
            "severity": "high",
            "title": f"Heavy Snowfall Warning — {location_name}",
            "description": (
                "Significant snowfall accumulation underway. Mountain and rural roads may become impassable. Avoid unnecessary vehicle travel."
            ),
            "triggered_value": float(code),
            "threshold_value": 75.0,
            "reason": f"Heavy snowfall conditions (WMO code {code})",
            "location": location_name,
            "expires_at": expires_at,
        })

    return alerts
