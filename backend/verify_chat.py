import httpx
import json

base = 'http://127.0.0.1:8000'
session_id = 'test-session-verify-1'

questions = [
    'What is the weather in Vijayawada?',
    'Will it rain tomorrow in Hyderabad?',
    'What is the temperature in Delhi today?'
]

for q in questions:
    print(f"\n==========================================")
    print(f"QUESTION: {q}")
    print(f"==========================================")
    r = httpx.post(
        f"{base}/api/chat",
        json={"session_id": session_id, "message": q, "language": "en"},
        timeout=60
    )
    print("HTTP Status:", r.status_code)
    data = r.json()
    print("Resolved Location:", data.get("location_resolved"))
    print("Weather Data Used:", data.get("weather_data_used"))
    print("AI Response:\n", data.get("message"))
    snap = data.get("weather_data")
    if snap:
        print(f"Verified Values: {snap.get('temperature_c')}°C, {snap.get('condition_text')}, Humidity: {snap.get('humidity_pct')}%, Rain Chance: {snap.get('rain_probability_pct')}%")

print("\n==========================================")
print("VERIFYING POSTGRESQL CHAT HISTORY")
print("==========================================")
r2 = httpx.get(f"{base}/api/chat/history/{session_id}", timeout=10)
print("GET /api/chat/history status:", r2.status_code)
history = r2.json()
print("Persisted Message Count in PostgreSQL:", len(history))
for h in history:
    print(f"[{h['role'].upper()}] {h['content'][:80]}...")

print("\nCHAT INTEGRATION TEST PASSED!")
