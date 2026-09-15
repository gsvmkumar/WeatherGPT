import urllib.request
import json

base = "http://127.0.0.1:8000"

print("--- 1. Testing Health ---")
with urllib.request.urlopen(f"{base}/health") as r:
    data = json.loads(r.read())
    print("Health:", data)

print("\n--- 2. Testing Locations Search ---")
with urllib.request.urlopen(f"{base}/api/locations/search?query=Vijayawada") as r:
    data = json.loads(r.read())
    print("Found locations:", len(data), "-> Top:", data[0]["name"], data[0]["country"])

print("\n--- 3. Testing Current Weather ---")
with urllib.request.urlopen(f"{base}/api/weather/current?location=Vijayawada") as r:
    data = json.loads(r.read())
    print("Current Weather in Vijayawada:", data["temperature_c"], "°C,", data.get("condition_text", ""))

print("\n--- 4. Testing Forecast ---")
with urllib.request.urlopen(f"{base}/api/weather/forecast?location=Vijayawada&days=5") as r:
    data = json.loads(r.read())
    print("Forecast days returned:", len(data["daily"]))

print("\n--- 5. Testing Alerts ---")
with urllib.request.urlopen(f"{base}/api/alerts?lat=16.5&lon=80.6") as r:
    data = json.loads(r.read())
    print("Alerts count:", len(data))

print("\n--- 6. Testing Advisories ---")
with urllib.request.urlopen(f"{base}/api/advisories?lat=16.5&lon=80.6") as r:
    data = json.loads(r.read())
    print("Advisories count:", len(data))

print("\n--- 7. Testing AI Chat ---")
req = urllib.request.Request(
    f"{base}/api/chat",
    data=json.dumps({
        "session_id": "verify-session-101",
        "message": "Will it rain tomorrow in Vijayawada? Should I carry an umbrella?",
        "language": "en",
        "location": "Vijayawada"
    }).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read())
    print("AI Chat Response:\n", data["message"])
    print("Weather data used:", data["weather_data_used"])
    print("Location resolved:", data["location_resolved"])

print("\n--- 8. Testing Frontend at http://localhost:3000 ---")
with urllib.request.urlopen("http://localhost:3000") as r:
    print("Frontend HTTP Status:", r.status)

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
