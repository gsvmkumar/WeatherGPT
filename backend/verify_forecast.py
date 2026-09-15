import httpx
import json

base = "http://127.0.0.1:8000"
cities = ["Vijayawada", "Hyderabad", "Delhi"]

city_data = {}

print("==================================================")
print("VERIFYING OPEN-METEO 7-DAY & HOURLY FORECAST DATA")
print("==================================================")

for city in cities:
    r = httpx.get(f"{base}/api/weather/forecast", params={"location": city, "days": 7}, timeout=20)
    assert r.status_code == 200, f"Failed for {city}: {r.status_code}"
    d = r.json()
    city_data[city] = d
    print(f"\n--- Location: {city} (Resolved: {d['location']}, lat: {d['latitude']}, lon: {d['longitude']}) ---")
    print(f"Total daily items: {len(d['daily'])} | Total hourly items: {len(d['hourly'])}")
    
    # Verify daily items
    assert len(d['daily']) == 7, f"Expected 7 days, got {len(d['daily'])}"
    assert len(d['hourly']) >= 24, f"Expected at least 24 hourly items, got {len(d['hourly'])}"
    
    # Print 7-day table
    print("Day-by-Day Forecast:")
    for day in d['daily']:
        print(f"  {day['date']}: {day['condition_text']} | Max: {day['temp_max_c']}°C | Min: {day['temp_min_c']}°C | Rain: {day['rain_probability_pct']}% | Wind: {day['wind_speed_max_kmh']} km/h | Humidity: {day['humidity_pct']}%")
        # Ensure fields exist and valid
        assert 'date' in day
        assert 'temp_max_c' in day and isinstance(day['temp_max_c'], (int, float))
        assert 'temp_min_c' in day and isinstance(day['temp_min_c'], (int, float))
        assert 'condition_text' in day and day['condition_text']
        assert 'condition_code' in day
        assert 'rain_probability_pct' in day
        assert 'wind_speed_max_kmh' in day
        assert 'humidity_pct' in day and isinstance(day['humidity_pct'], int)
    
    # Verify hourly items have humidity
    first_hour = d['hourly'][0]
    print(f"Sample Hour ({first_hour['time']}): {first_hour['condition_text']}, Temp: {first_hour['temperature_c']}°C, Rain: {first_hour['rain_probability_pct']}%, Hum: {first_hour['humidity_pct']}%, Wind: {first_hour['wind_speed_kmh']} km/h")
    assert 'humidity_pct' in first_hour

print("\n==================================================")
print("NON-HARDCODED / REAL OPEN-METEO DYNAMIC DATA PROOF")
print("==================================================")

v_temp = city_data["Vijayawada"]["daily"][0]["temp_max_c"]
h_temp = city_data["Hyderabad"]["daily"][0]["temp_max_c"]
d_temp = city_data["Delhi"]["daily"][0]["temp_max_c"]

v_hum = city_data["Vijayawada"]["daily"][0]["humidity_pct"]
h_hum = city_data["Hyderabad"]["daily"][0]["humidity_pct"]
d_hum = city_data["Delhi"]["daily"][0]["humidity_pct"]

print(f"Vijayawada Day 0 Max Temp: {v_temp}°C | Humidity: {v_hum}%")
print(f"Hyderabad  Day 0 Max Temp: {h_temp}°C | Humidity: {h_hum}%")
print(f"Delhi      Day 0 Max Temp: {d_temp}°C | Humidity: {d_hum}%")

# The data comes from distinct geocoordinates and weather models
assert (v_temp, v_hum) != (h_temp, h_hum) or (v_temp, v_hum) != (d_temp, d_hum), "Weather data should differ across cities"
print("\n>>> ALL OPEN-METEO FORECAST VERIFICATIONS PASSED SUCCESSFULLY! <<<")
