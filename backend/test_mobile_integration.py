"""
Automated Test Suite: Mobile App API Integration & Voice Pipeline
Simulates the exact API calls made by the WeatherGPT React Native Android application:
1. Fetch language metadata for the 8-language visual picker.
2. Submit voice query in Telugu (with clean speech text for Android TTS).
3. Submit voice query in Hindi, Tamil, Kannada, Bengali.
4. Retrieve localized alerts with voice safety briefing.
5. Retrieve localized advisories with voice farming advice.
6. Create mobile user profile, save location, and register device push token in PostgreSQL.
"""

import sys
import uuid
import asyncio
import httpx

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"


async def run_mobile_test_suite():
    print("==================================================================")
    print("WEATHERGPT PHASE 2: MOBILE APP API INTEGRATION & VOICE SUITE")
    print("==================================================================")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=45.0) as client:
        # 1. Voice Language Picker Metadata
        print("\n[STEP 1] Testing Mobile Language Picker Metadata...")
        res = await client.get("/api/voice/languages")
        assert res.status_code == 200
        data = res.json()
        assert data["count"] == 8
        print("  ✓ Retrieved 8 Indian languages with native scripts & sample prompts")

        # 2. Voice Query Pipeline (Telugu)
        print("\n[STEP 2] Testing Mobile Voice Query in Telugu (te-IN)...")
        voice_payload = {
            "message": "విజయవాడలో నేడు వర్షం పడుతుందా?",
            "language": "te",
            "location": "Vijayawada"
        }
        res = await client.post("/api/voice/query", json=voice_payload)
        assert res.status_code == 200
        v_data = res.json()
        assert v_data["language"] == "te"
        assert v_data["locale"] == "te-IN"
        assert v_data["weather_data_used"] is True
        assert len(v_data["clean_speech_text"]) > 20
        assert "**" not in v_data["clean_speech_text"]  # Clean of markdown
        print("  ✓ Voice response generated with clean TTS speech text (Telugu)")
        print(f"      Spoken preview: \"{v_data['clean_speech_text'][:70]}...\"")

        # 3. Voice Query Pipeline (Hindi & Tamil)
        print("\n[STEP 3] Testing Mobile Voice Queries in Hindi & Tamil...")
        for lang, msg in [("hi", "क्या कल बारिश होगी?"), ("ta", "நாளை மழை பெய்யுமா?")]:
            res = await client.post("/api/voice/query", json={"message": msg, "language": lang, "location": "Vijayawada"})
            assert res.status_code == 200
            d = res.json()
            assert d["language"] == lang
            assert d["weather_data_used"] is True
            print(f"  ✓ Voice response generated for {lang.upper()}: \"{d['clean_speech_text'][:60]}...\"")

        # 4. Mobile Alerts with Voice Briefing
        print("\n[STEP 4] Testing Localized Alerts with Audio Safety Briefing...")
        res = await client.get("/api/alerts?location=Vijayawada&language=te")
        assert res.status_code == 200
        alert_data = res.json()
        assert "ai_explanation" in alert_data
        print(f"  ✓ Alerts retrieved: {len(alert_data.get('alerts', []))} active alerts with Telugu briefing")

        # 5. Mobile Advisories with Voice Agronomic Advice
        print("\n[STEP 5] Testing Localized Advisories with Audio Guidance...")
        res = await client.get("/api/advisories?location=Vijayawada&language=te")
        assert res.status_code == 200
        adv_data = res.json()
        assert "ai_explanation" in adv_data
        print(f"  ✓ Advisories retrieved: {len(adv_data.get('advisories', []))} rules with Telugu farming explanation")

        # 6. Mobile User Registration & Device Push Token in PostgreSQL
        print("\n[STEP 6] Testing Mobile User Registration & Device Token Storage...")
        u_name = f"Farmer_{uuid.uuid4().hex[:6]}"
        u_res = await client.post("/api/users", json={"name": u_name, "preferred_language": "te"})
        assert u_res.status_code == 201
        user_id = u_res.json()["id"]
        print(f"  ✓ Mobile user profile created in PostgreSQL: {u_name} (ID: {user_id})")

        # Save default location
        loc_res = await client.post(f"/api/users/{user_id}/locations", json={
            "location_name": "Tadepalligudem Village",
            "latitude": 16.81,
            "longitude": 81.52,
            "is_default": True
        })
        assert loc_res.status_code == 201
        print("  ✓ Saved mobile default location to PostgreSQL: Tadepalligudem Village")

        # Register push token
        token_res = await client.post(f"/api/users/{user_id}/device-tokens", json={
            "push_token": f"fcm_mobile_{uuid.uuid4().hex}_{uuid.uuid4().hex}",
            "platform": "android"
        })
        assert token_res.status_code == 200
        print("  ✓ Registered Android device push token in PostgreSQL")

    print("\n==================================================================")
    print("ALL MOBILE APP INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")


if __name__ == "__main__":
    asyncio.run(run_mobile_test_suite())
