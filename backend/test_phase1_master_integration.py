import asyncio
import httpx
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

async def run_master_suite():
    async with httpx.AsyncClient(timeout=45.0) as client:
        print("==================================================================")
        print("WEATHERGPT PHASE 1: MASTER INTEGRATION TEST SUITE")
        print("==================================================================")

        # ── 1. Multilingual English + Telugu ─────────────────────────────
        print("\n[STEP 1/4] Verifying Multilingual English + Telugu...")
        req_en = {
            "session_id": "master-test-en",
            "message": "What is the weather in Tadepalligudem?",
            "language": "en"
        }
        res_en = await client.post(f"{BASE_URL}/api/chat", json=req_en)
        assert res_en.status_code == 200
        d_en = res_en.json()
        assert d_en["weather_data_used"] is True
        assert "Tadepalligudem" in (d_en.get("weather_data") or {}).get("location", "")

        req_te = {
            "session_id": "master-test-te",
            "message": "తాడేపల్లిగూడెంలో ప్రస్తుతం వాతావరణం ఎలా ఉంది?",
            "language": "te"
        }
        res_te = await client.post(f"{BASE_URL}/api/chat", json=req_te)
        assert res_te.status_code == 200
        d_te = res_te.json()
        assert d_te["weather_data_used"] is True

        temp_en = (d_en.get("weather_data") or {}).get("temperature_c")
        temp_te = (d_te.get("weather_data") or {}).get("temperature_c")
        assert abs(temp_en - temp_te) < 0.5
        print(f"  ✓ English & Telugu chat grounded in identical weather data (Temp: {temp_en}°C)")

        # ── 2. Agricultural Advisory ─────────────────────────────────────
        print("\n[STEP 2/4] Verifying Agricultural Advisory...")
        res_adv = await client.get(f"{BASE_URL}/api/advisories?location=Kakinada&language=en")
        assert res_adv.status_code == 200
        d_adv = res_adv.json()
        assert d_adv["total"] > 0
        assert d_adv.get("ai_explanation") is not None
        agri_recs = [a for a in d_adv["advisories"] if a["category"] == "agriculture"]
        assert len(agri_recs) > 0
        print(f"  ✓ {len(agri_recs)} deterministic agricultural rules fired for Kakinada")
        print(f"  ✓ Grounded AI explanation attached ({len(d_adv['ai_explanation'])} chars)")

        # ── 3. Real Weather Alerts ───────────────────────────────────────
        print("\n[STEP 3/4] Verifying Dynamic Weather Alerts...")
        res_alert = await client.get(f"{BASE_URL}/api/alerts?location=Tadepalligudem&language=en")
        assert res_alert.status_code == 200
        d_alert = res_alert.json()
        assert d_alert.get("ai_explanation") is not None
        for a in d_alert["alerts"]:
            assert a["location"] == d_alert["location"]
            assert a["severity"] in {"low", "medium", "high", "critical"}
            assert a.get("reason") is not None
        print(f"  ✓ Alerts dynamically computed with location stamping & threshold reasons")
        print(f"  ✓ AI Public Safety Briefing attached ({len(d_alert['ai_explanation'])} chars)")

        # ── 4. Location Picker / Search ──────────────────────────────────
        print("\n[STEP 4/4] Verifying Location Picker / Search...")
        test_cities = ["Vijayawada", "Visakhapatnam", "Hyderabad", "Bhimavaram", "Delhi"]
        for city in test_cities:
            res_loc = await client.get(f"{BASE_URL}/api/locations/search?q={city}")
            assert res_loc.status_code == 200
            locs = res_loc.json()
            assert len(locs) > 0
            best = locs[0]
            assert best["latitude"] is not None and best["longitude"] is not None
            print(f"  ✓ '{city}' resolved -> {best['name']}, {best.get('state')} ({best['latitude']:.2f}, {best['longitude']:.2f})")

        # Invalid location check
        res_inv = await client.get(f"{BASE_URL}/api/locations/search?q=invalidplacenamexyz999")
        assert res_inv.status_code == 404
        print(f"  ✓ Invalid location correctly rejected with 404 not found")

        print("\n==================================================================")
        print("ALL PHASE 1 CORE FEATURES VERIFIED AND PASSING SUCCESSFULLY!")
        print("==================================================================")

if __name__ == "__main__":
    asyncio.run(run_master_suite())
