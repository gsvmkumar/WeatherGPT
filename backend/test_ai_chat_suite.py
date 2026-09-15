import httpx
import uuid

base = "http://127.0.0.1:8000"
session_id = str(uuid.uuid4())

print("==================================================")
print("TESTING WEATHERGPT AI CHAT SUITE")
print(f"Session ID: {session_id}")
print("==================================================")

# --- Question 1 ---
q1 = "What is the weather in Vijayawada?"
print(f"\n[Test 1] Asking: '{q1}'")
r1 = httpx.post(f"{base}/api/chat", json={"session_id": session_id, "message": q1, "language": "en"}, timeout=60)
assert r1.status_code == 200, f"Q1 failed with status {r1.status_code}: {r1.text}"
d1 = r1.json()
print("HTTP Status:", r1.status_code)
print("Resolved Location:", d1.get("location_resolved"))
print("Weather Data Used:", d1.get("weather_data_used"))
snap1 = d1.get("weather_data")
assert snap1 is not None, "Expected weather_data snapshot"
assert "temperature_c" in snap1
assert "feels_like_c" in snap1
assert "humidity_pct" in snap1
assert "wind_speed_kmh" in snap1
assert "rain_probability_pct" in snap1
assert "condition_text" in snap1
print(f"Weather Card Data: Temp: {snap1['temperature_c']}°C, Feels: {snap1['feels_like_c']}°C, Hum: {snap1['humidity_pct']}%, Wind: {snap1['wind_speed_kmh']} km/h, Rain: {snap1['rain_probability_pct']}%, Condition: {snap1['condition_text']}")
print("AI Response:\n", d1.get("message"))

# --- Question 2 ---
q2 = "Will it rain tomorrow in Hyderabad?"
print(f"\n[Test 2] Asking: '{q2}'")
r2 = httpx.post(f"{base}/api/chat", json={"session_id": session_id, "message": q2, "language": "en"}, timeout=60)
assert r2.status_code == 200, f"Q2 failed with status {r2.status_code}: {r2.text}"
d2 = r2.json()
print("HTTP Status:", r2.status_code)
print("Resolved Location:", d2.get("location_resolved"))
print("Weather Data Used:", d2.get("weather_data_used"))
snap2 = d2.get("weather_data")
print("AI Response:\n", d2.get("message"))

# --- Question 3 ---
q3 = "What is the temperature in Delhi today?"
print(f"\n[Test 3] Asking: '{q3}'")
r3 = httpx.post(f"{base}/api/chat", json={"session_id": session_id, "message": q3, "language": "en"}, timeout=60)
assert r3.status_code == 200, f"Q3 failed with status {r3.status_code}: {r3.text}"
d3 = r3.json()
print("HTTP Status:", r3.status_code)
print("Resolved Location:", d3.get("location_resolved"))
print("Weather Data Used:", d3.get("weather_data_used"))
snap3 = d3.get("weather_data")
print("AI Response:\n", d3.get("message"))

# --- Chat History Retrieval ---
print("\n[Test 4] Retrieving Chat History from PostgreSQL...")
rh = httpx.get(f"{base}/api/chat/history/{session_id}", timeout=15)
assert rh.status_code == 200, f"History fetch failed: {rh.status_code}"
history = rh.json()
print(f"Persisted message count: {len(history)} (Expected: 6)")
assert len(history) == 6, f"Expected 6 messages in history, found {len(history)}"
for i, m in enumerate(history):
    print(f"  {i+1}. [{m['role'].upper()}] {m['content'][:65]}... (has_weather_card: {m.get('weather_data') is not None})")

# --- Clear Chat History ---
print("\n[Test 5] Testing Clear Chat (DELETE /api/chat/history/{session_id})...")
rd = httpx.delete(f"{base}/api/chat/history/{session_id}", timeout=15)
assert rd.status_code == 200, f"Clear chat failed: {rd.status_code}"
print("DELETE Response:", rd.json())

rh2 = httpx.get(f"{base}/api/chat/history/{session_id}", timeout=15)
assert rh2.status_code == 200
history2 = rh2.json()
print(f"Messages remaining after clear: {len(history2)} (Expected: 0)")
assert len(history2) == 0, f"Expected 0 messages after clear, got {len(history2)}"

# --- Error Handling ---
print("\n[Test 6] Testing Error Handling (Empty message)...")
re = httpx.post(f"{base}/api/chat", json={"session_id": session_id, "message": "   ", "language": "en"}, timeout=15)
print("Empty message HTTP status:", re.status_code)
assert re.status_code == 400, f"Expected 400 for empty message, got {re.status_code}"

print("\n>>> ALL AI CHAT SUITE TESTS PASSED 100%! <<<")
