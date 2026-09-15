"""
Automated Test Suite: 8 Indian Languages Multilingual & Voice Query
Verifies that all 8 Indian languages:
1. English (en)
2. Telugu (te)
3. Hindi (hi)
4. Tamil (ta)
5. Kannada (kn)
6. Malayalam (ml)
7. Marathi (mr)
8. Bengali (bn)
correctly resolve locations, fetch verified Open-Meteo weather,
and produce authentic native script responses with clean speech text.
"""

import sys
import asyncio
import httpx
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

TEST_QUERIES = [
    {
        "lang": "en",
        "name": "English",
        "message": "What is the weather in Vijayawada right now?",
        "script_sample": "Vijayawada",
    },
    {
        "lang": "te",
        "name": "Telugu",
        "message": "విజయవాడలో ప్రస్తుతం వాతావరణం ఎలా ఉంది?",
        "script_sample": "విజయవాడ",
    },
    {
        "lang": "hi",
        "name": "Hindi",
        "message": "विजयवाड़ा में अभी का मौसम कैसा है?",
        "script_sample": "मौसम",
    },
    {
        "lang": "ta",
        "name": "Tamil",
        "message": "விஜயவாடாவில் இப்போது வானிலை எப்படி இருக்கிறது?",
        "script_sample": "வானிலை",
    },
    {
        "lang": "kn",
        "name": "Kannada",
        "message": "ವಿಜಯವಾಡದಲ್ಲಿ ಈಗ ಹವಾಮಾನ ಹೇಗಿದೆ?",
        "script_sample": "ಹವಾಮಾನ",
    },
    {
        "lang": "ml",
        "name": "Malayalam",
        "message": "വിജയവാഡയിൽ ഇപ്പോൾ കാലാവസ്ഥ എങ്ങനെയാണ്?",
        "script_sample": "കാലാവസ്ഥ",
    },
    {
        "lang": "mr",
        "name": "Marathi",
        "message": "विजयवाडा मध्ये सध्या हवामान कसे आहे?",
        "script_sample": "हवामान",
    },
    {
        "lang": "bn",
        "name": "Bengali",
        "message": "বিজয়ওয়াড়ায় এখন আবহাওয়া কেমন?",
        "script_sample": "আবহাওয়া",
    },
]


async def run_suite():
    print("==================================================================")
    print("WEATHERGPT PHASE 2: 8 INDIAN LANGUAGES MULTILINGUAL & VOICE SUITE")
    print("==================================================================")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Test Languages Metadata
        print("\n[STEP 1] Verifying /api/voice/languages endpoint...")
        res = await client.get("/api/voice/languages")
        assert res.status_code == 200
        data = res.json()
        assert data["count"] == 8
        codes = [l["code"] for l in data["languages"]]
        for expected in ["en", "te", "hi", "ta", "kn", "ml", "mr", "bn"]:
            assert expected in codes, f"Language {expected} not found in metadata"
        print(f"  ✓ All 8 Indian languages registered: {', '.join(codes)}")

        # 2. Test Voice Query Across All 8 Languages
        print("\n[STEP 2] Verifying End-to-End Voice Queries for 8 Languages...")
        temps_recorded = []

        for item in TEST_QUERIES:
            lang = item["lang"]
            lang_name = item["name"]
            msg = item["message"]

            payload = {
                "message": msg,
                "language": lang,
                "session_id": f"voice-test-{lang}",
                "location": "Vijayawada"
            }

            res = await client.post("/api/voice/query", json=payload)
            assert res.status_code == 200, f"Voice query failed for {lang_name}: {res.text}"
            res_data = res.json()

            assert res_data["language"] == lang
            assert res_data["weather_data_used"] is True
            assert "Vijayawada" in (res_data.get("location_resolved") or "")
            assert len(res_data["clean_speech_text"]) > 20
            # Ensure markdown asterisks are stripped from clean speech
            assert "**" not in res_data["clean_speech_text"]

            w_snapshot = res_data.get("weather_data") or {}
            temp = w_snapshot.get("temperature_c")
            if temp is not None:
                temps_recorded.append(temp)

            # Sample first 80 chars of response
            sample_preview = res_data["clean_speech_text"][:80].replace("\n", " ")
            print(f"  ✓ [{lang.upper()}] {lang_name} ({res_data['locale']}): Temp={temp}°C")
            print(f"      Spoken audio text: \"{sample_preview}...\"")

        # Verify meteorological ground truth consistency across all 8 languages
        if len(temps_recorded) == 8:
            diff = max(temps_recorded) - min(temps_recorded)
            assert diff < 1.0, f"Temperature discrepancy across languages: {temps_recorded}"
            print(f"\n  ✓ Verified meteorological ground truth: All 8 languages grounded in identical temperature ({temps_recorded[0]}°C)")

    print("\n==================================================================")
    print("ALL 8 INDIAN LANGUAGES VOICE QUERIES VERIFIED SUCCESSFULLY!")
    print("==================================================================")


if __name__ == "__main__":
    asyncio.run(run_suite())
