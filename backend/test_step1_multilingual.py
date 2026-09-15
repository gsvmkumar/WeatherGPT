import asyncio
import httpx
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def run_test():
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("=== 1. Testing English Query ===")
        req_en = {
            "session_id": "test-session-step1-en-12345",
            "message": "What is the weather in Tadepalligudem?",
            "language": "en"
        }
        res_en = await client.post("http://localhost:8000/api/chat", json=req_en)
        assert res_en.status_code == 200, f"EN failed: {res_en.text}"
        data_en = res_en.json()
        print(f"EN Response: {data_en['message']}\n")
        print(f"EN Weather Snapshot: {data_en.get('weather_data')}\n")

        print("=== 2. Testing Telugu Query ===")
        req_te = {
            "session_id": "test-session-step1-te-12345",
            "message": "తాడేపల్లిగూడెంలో ప్రస్తుతం వాతావరణం ఎలా ఉంది?",
            "language": "te"
        }
        res_te = await client.post("http://localhost:8000/api/chat", json=req_te)
        assert res_te.status_code == 200, f"TE failed: {res_te.text}"
        data_te = res_te.json()
        print(f"TE Response: {data_te['message']}\n")
        print(f"TE Weather Snapshot: {data_te.get('weather_data')}\n")

        # Comparisons
        snap_en = data_en.get('weather_data') or {}
        snap_te = data_te.get('weather_data') or {}
        print("=== 3. Consistency Verification ===")
        print(f"EN Temperature: {snap_en.get('temperature_c')}°C vs TE Temperature: {snap_te.get('temperature_c')}°C")
        print(f"EN Humidity: {snap_en.get('humidity_pct')}% vs TE Humidity: {snap_te.get('humidity_pct')}%")
        print(f"EN Wind Speed: {snap_en.get('wind_speed_kmh')} km/h vs TE Wind Speed: {snap_te.get('wind_speed_kmh')} km/h")
        
        temp_diff = abs(snap_en.get('temperature_c', 0) - snap_te.get('temperature_c', 0))
        assert temp_diff < 0.5, f"Temperature discrepancy too high: {temp_diff}"
        assert data_en['weather_data_used'] == True, "EN did not use weather data"
        assert data_te['weather_data_used'] == True, "TE did not use weather data"
        print("\nSUCCESS: Both English and Telugu used verified Open-Meteo data!")

if __name__ == "__main__":
    asyncio.run(run_test())
