import httpx
import time
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')

base = "http://127.0.0.1:8000"

print("==================================================")
print("GEOCODING & LOCATION ENHANCEMENT TEST SUITE")
print("==================================================")

# --- 1. Test search endpoint for Tadepalligudem ---
print("\n[Test 1] GET /api/locations/search?q=Tadepalligudem")
r1 = httpx.get(f"{base}/api/locations/search", params={"q": "Tadepalligudem", "limit": 5}, timeout=15)
assert r1.status_code == 200, f"Failed with {r1.status_code}: {r1.text}"
results1 = r1.json()
print(f"Found {len(results1)} location(s):")
for item in results1:
    print(f"  - {item['name']}, State: {item['state']}, Country: {item['country']} | Lat: {item['latitude']}, Lon: {item['longitude']} | Display: {item['display_name']}")
top = results1[0]
assert "tadepalligudem" in top['name'].lower()
assert top['state'] == "Andhra Pradesh"
assert abs(top['latitude'] - 16.81) < 0.1
assert abs(top['longitude'] - 81.52) < 0.1

# --- 2. Test live current weather endpoint for Tadepalligudem ---
print("\n[Test 2] GET /api/weather/current?location=Tadepalligudem")
r2 = httpx.get(f"{base}/api/weather/current", params={"location": "Tadepalligudem"}, timeout=15)
assert r2.status_code == 200, f"Failed with {r2.status_code}: {r2.text}"
w2 = r2.json()
print(f"Weather for {w2['location']}: {w2['temperature_c']}°C, {w2['condition_text']}, Humidity: {w2['humidity_pct']}%, Wind: {w2['wind_speed_kmh']} km/h (lat: {w2['latitude']}, lon: {w2['longitude']})")
assert abs(w2['latitude'] - 16.81) < 0.1

# --- 3. Test live forecast endpoint for Tadepalligudem ---
print("\n[Test 3] GET /api/weather/forecast?location=Tadepalligudem&days=7")
r3 = httpx.get(f"{base}/api/weather/forecast", params={"location": "Tadepalligudem", "days": 7}, timeout=15)
assert r3.status_code == 200, f"Failed with {r3.status_code}: {r3.text}"
f3 = r3.json()
print(f"7-day Forecast retrieved for {f3['location']}. Day 0: Max {f3['daily'][0]['temp_max_c']}°C, Min {f3['daily'][0]['temp_min_c']}°C, Hum: {f3['daily'][0]['humidity_pct']}%")

# --- 4. Requirement 11: Specifically verify AI Chat question ---
prompt11 = "What is the weather right now in Tadepalligudem?"
print(f"\n[Test 4 - Req 11] Asking Chat: '{prompt11}'")
session_id = str(uuid.uuid4())
r4 = httpx.post(f"{base}/api/chat", json={"session_id": session_id, "message": prompt11, "language": "en"}, timeout=60)
assert r4.status_code == 200, f"Chat failed with {r4.status_code}: {r4.text}"
c4 = r4.json()
print("Resolved Location:", c4.get("location_resolved"))
print("Weather Data Used:", c4.get("weather_data_used"))
snap4 = c4.get("weather_data")
print("Weather Card attached:", snap4)
print("AI Response:\n", c4.get("message"))
assert "tadepalligudem" in (c4.get("location_resolved") or "").lower()
assert c4.get("weather_data_used") is True
assert snap4 is not None
assert abs(snap4['temperature_c']) > 0

# --- 5. Requirement 12: Backend tests for 5 mandatory cities ---
print("\n[Test 5 - Req 12] Testing 5 mandatory cities...")
mandatory_cities = ["Kakinada", "Tadepalligudem", "Vijayawada", "Hyderabad", "Delhi"]
for city in mandatory_cities:
    rc = httpx.get(f"{base}/api/locations/search", params={"q": city, "limit": 1}, timeout=15)
    assert rc.status_code == 200, f"Failed for {city}"
    loc = rc.json()[0]
    print(f"  {city:15} -> {loc['name']} ({loc['state']}), lat: {loc['latitude']}, lon: {loc['longitude']}")

# --- 6. Edge cases (case, spaces, suffix) ---
print("\n[Test 6] Testing edge cases...")
edge_queries = ["tadepalligudem", "TADEPALLIGUDEM", "  Tadepalligudem  ", "Tadepalligudem, AP", "Tadepalli gudem"]
for eq in edge_queries:
    re = httpx.get(f"{base}/api/locations/search", params={"q": eq, "limit": 1}, timeout=15)
    assert re.status_code == 200, f"Failed edge query {eq}"
    loc = re.json()[0]
    print(f"  {eq!r:25} -> {loc['name']}, lat: {loc['latitude']}, lon: {loc['longitude']}")
    assert abs(loc['latitude'] - 16.81) < 0.1

# --- 7. Cache performance test ---
print("\n[Test 7] Testing Geocoding Cache...")
t0 = time.perf_counter()
httpx.get(f"{base}/api/locations/search", params={"q": "Tadepalligudem", "limit": 1})
duration_ms = (time.perf_counter() - t0) * 1000
print(f"Cached lookup completed in {duration_ms:.2f} ms")

print("\n>>> ALL GEOCODING SUITE TESTS PASSED 100%! <<<")
