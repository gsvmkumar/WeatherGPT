"""
WeatherGPT — Advisory Engine
Generates weather-based advisories using predefined rules + LLM explanation.
The LLM only adds natural-language polish — the underlying facts come from weather data.
"""

from typing import Any


# ── Advisory Rules ────────────────────────────────────────────────────────────
# Each rule returns a recommendation string if its condition is met, else None.

def _agriculture_rules(weather: dict[str, Any]) -> list[str]:
    """
    Agriculture/farmer advisory rules grounded strictly in real weather observations.
    Transparent, deterministic thresholds for farm planning, spraying, irrigation, and crop protection.
    """
    recommendations = []
    rain_prob = weather.get("rain_probability_pct", 0)
    temp = weather.get("temperature_c", 0.0)
    wind = weather.get("wind_speed_kmh", 0.0)
    humidity = weather.get("humidity_pct", 0)
    precip = weather.get("precipitation_mm", 0.0)
    code = weather.get("condition_code", 0)

    # 1. Rain Expected / Heavy Rainfall rules
    if rain_prob >= 70 or precip >= 10.0 or code in {63, 65, 81, 82}:
        recommendations.append(
            "Heavy rainfall expected. Postpone pesticide spraying and fertilizer application immediately — runoff will waste chemicals and contaminate local water bodies."
        )
        recommendations.append(
            "Ensure proper drainage channels in agricultural fields to prevent waterlogging and root damage."
        )
    elif rain_prob >= 40 or precip >= 0.5 or code in {51, 53, 55, 61, 80}:
        recommendations.append(
            "Rain is expected in the next 24 hours. Consider postponing pesticide spraying."
        )
        recommendations.append(
            "Hold off on scheduled irrigation to conserve water and avoid oversaturating field soil."
        )

    # 2. High Temperature rules
    if temp >= 38:
        recommendations.append(
            f"High temperature ({temp}°C) causing severe heat stress. Irrigate crops in the early morning or after sunset to reduce evaporation loss and protect blooming crops."
        )
    elif temp >= 34:
        recommendations.append(
            f"High temperature conditions ({temp}°C). Maintain soil mulching and monitor shallow-rooted crops for wilt."
        )

    # 3. High Humidity / Fungal Risk rules
    if humidity >= 80 and temp >= 24:
        recommendations.append(
            f"High humidity ({humidity}%) and warm weather favor rapid fungal and pest spore multiplication. Inspect crops for leaf spots, blast, or blight."
        )

    # 4. Strong Wind rules
    if wind >= 35:
        recommendations.append(
            f"Strong winds ({wind} km/h) detected. Provide staking or earthing-up for vulnerable crops (banana, sugarcane, maize) and suspend all pesticide spraying to prevent chemical drift."
        )

    # 5. Suitable conditions for outdoor agricultural activity
    is_rain_heavy = rain_prob >= 40 or precip >= 1.0 or code in {63, 65, 81, 82, 95, 96, 99}
    is_wind_heavy = wind >= 30
    is_temp_extreme = temp >= 38 or temp < 10

    if not is_rain_heavy and not is_wind_heavy and not is_temp_extreme:
        recommendations.append(
            "Weather conditions are currently suitable for outdoor agricultural activity."
        )
        if rain_prob < 25:
            recommendations.append(
                "Favorable dry window for weeding, tilling, intercultural operations, and crop harvesting."
            )

    return recommendations


def _travel_rules(weather: dict[str, Any]) -> list[str]:
    """Travel advisory rules."""
    recommendations = []
    rain_prob = weather.get("rain_probability_pct", 0)
    wind = weather.get("wind_speed_kmh", 0.0)
    temp = weather.get("temperature_c", 0.0)
    code = weather.get("condition_code", 0)

    if code in {95, 96, 99}:
        recommendations.append(
            "Thunderstorm conditions. Avoid non-essential travel. If driving, pull over safely "
            "and wait for the storm to pass. Do not drive through flooded roads."
        )
    elif rain_prob >= 70:
        recommendations.append(
            "Heavy rain likely. Allow extra travel time — road visibility and grip will be reduced. "
            "Use headlights, maintain safe following distances, and avoid underpasses prone to flooding."
        )
    elif rain_prob >= 40:
        recommendations.append(
            "Some rain possible. Carry an umbrella or raincoat. Road surfaces may be slippery — "
            "drive carefully, especially on curves and at junctions."
        )

    if wind >= 50:
        recommendations.append(
            "Strong crosswinds on highways and bridges. Drive at reduced speed and keep a firm grip "
            "on the steering wheel. High-sided vehicles should exercise extra caution."
        )

    if temp >= 40:
        recommendations.append(
            "Extreme heat advisory for travellers. Carry adequate water. Check your vehicle's "
            "coolant and tyre pressure before long trips — both are affected by heat."
        )

    return recommendations


def _outdoor_rules(weather: dict[str, Any]) -> list[str]:
    """Outdoor activity advisory rules."""
    recommendations = []
    rain_prob = weather.get("rain_probability_pct", 0)
    temp = weather.get("temperature_c", 0.0)
    wind = weather.get("wind_speed_kmh", 0.0)
    code = weather.get("condition_code", 0)
    is_day = weather.get("is_day", True)

    if code in {95, 96, 99}:
        recommendations.append(
            "Thunderstorm warning. All outdoor activities should be postponed immediately. "
            "Seek shelter in a sturdy building or vehicle. Avoid open fields and trees."
        )
    elif rain_prob >= 70:
        recommendations.append(
            "Heavy rain likely. Outdoor events and activities are not recommended. "
            "If unavoidable, ensure proper shelter is available on-site."
        )
    elif rain_prob >= 40:
        recommendations.append(
            "Possibility of rain. Keep outdoor activities flexible and have a contingency plan. "
            "Carry rain gear if you must go out."
        )

    if temp >= 38 and is_day:
        recommendations.append(
            "Heat index is very high. Avoid strenuous outdoor activity between 11 AM and 4 PM. "
            "If exercising outdoors, do so early morning or after sunset. "
            "Drink water every 20 minutes even if not thirsty."
        )

    if wind >= 40:
        recommendations.append(
            "Strong winds make outdoor activities uncomfortable and potentially dangerous. "
            "Secure tents and canopies. Avoid cycling or motorcycling in open areas."
        )

    return recommendations


def _general_safety_rules(weather: dict[str, Any]) -> list[str]:
    """General public safety recommendations."""
    recommendations = []
    rain_prob = weather.get("rain_probability_pct", 0)
    temp = weather.get("temperature_c", 0.0)
    humidity = weather.get("humidity_pct", 0)
    code = weather.get("condition_code", 0)

    if temp >= 40:
        recommendations.append(
            "Heat emergency conditions. Keep vulnerable people (elderly, children, those with chronic illness) "
            "in cool, air-conditioned spaces. Recognise signs of heat stroke: confusion, no sweating, "
            "high body temperature. Call emergency services immediately if suspected."
        )

    if rain_prob >= 70 or code in {65, 82}:
        recommendations.append(
            "Heavy rain may cause localised flooding. Do not wade through floodwater — "
            "even 15 cm of moving water can knock you down. Report flooding to local authorities."
        )

    if code in {95, 96, 99}:
        recommendations.append(
            "Lightning safety: If outdoors, crouch low with feet together. Do not lie flat. "
            "Avoid hilltops, open fields, lone trees, and bodies of water."
        )

    return recommendations


CATEGORY_MAP = {
    "agriculture": _agriculture_rules,
    "travel": _travel_rules,
    "outdoor": _outdoor_rules,
    "general": _general_safety_rules,
}


def generate_advisories(weather: dict[str, Any], categories: list[str] | None = None) -> list[dict[str, Any]]:
    """
    Generate advisories for the given weather conditions.

    Args:
        weather: Current weather data dict.
        categories: List of categories to generate ('agriculture','travel','outdoor','general').
                    If None, generates all categories.

    Returns:
        List of advisory dicts with category and recommendation.
    """
    if categories is None:
        categories = list(CATEGORY_MAP.keys())

    advisories = []
    for category in categories:
        rule_fn = CATEGORY_MAP.get(category)
        if not rule_fn:
            continue
        recommendations = rule_fn(weather)
        for rec in recommendations:
            advisories.append({
                "category": category,
                "recommendation": rec,
            })

    return advisories
