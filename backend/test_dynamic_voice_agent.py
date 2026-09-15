import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.services.llm_service import extract_intent_and_location
from app.routers.voice import VoiceQueryRequest, execute_voice_query_pipeline
from app.database import AsyncSessionLocal


# ── TEST 1: Mode Switching Intents (English & Multilingual) ───────────────────
async def test_switch_to_voice_variations():
    queries = [
        "Yes, continue with voice.",
        "Can you continue talking to me?",
        "Let's use voice.",
        "I want voice mode.",
        "Talk to me.",
        "నాతో వాయిస్ లో మాట్లాడు",
        "मुझसे बात करो",
    ]
    for q in queries:
        res = await extract_intent_and_location(q)
        cat = res.get("category")
        assert cat == "SWITCH_TO_VOICE", f"Failed for '{q}': got {cat}"


async def test_switch_to_classic_variations():
    queries = [
        "Show me the normal screen.",
        "I don't want voice.",
        "Let me see the weather.",
        "Switch to text mode.",
        "Open classic mode.",
        "క్లాసిక్ మోడ్ చూపించు",
        "क्लासिक मोड में जाओ",
    ]
    for q in queries:
        res = await extract_intent_and_location(q)
        cat = res.get("category")
        assert cat == "SWITCH_TO_CLASSIC", f"Failed for '{q}': got {cat}"


# ── TEST 2: Weather, Forecast, & Advisory Queries ─────────────────────────────
async def test_weather_and_forecast_queries():
    test_cases = [
        ("What is the weather today?", {"WEATHER_QUERY"}),
        ("Will it rain tomorrow?", {"WEATHER_QUERY", "HOURLY_FORECAST", "WEEKLY_FORECAST"}),
        ("How hot will it be this afternoon?", {"WEATHER_QUERY", "HOURLY_FORECAST"}),
        ("What will the weather be like this evening?", {"HOURLY_FORECAST", "WEATHER_QUERY"}),
        ("How is the weather this week?", {"WEEKLY_FORECAST"}),
        ("What about the next seven days?", {"WEEKLY_FORECAST"}),
        ("Check weather in Vijayawada.", {"WEATHER_QUERY", "LOCATION_CHANGE"}),
        ("Change my location to Hyderabad.", {"LOCATION_CHANGE"}),
        ("Are there any severe weather warnings?", {"ALERT_QUERY"}),
        ("Is there a cyclone warning near me?", {"ALERT_QUERY"}),
        ("Where can I go if there is a flood?", {"SHELTER_QUERY"}),
        ("Show nearby safe shelters.", {"SHELTER_QUERY"}),
        ("What should farmers do today?", {"ADVISORY_QUERY"}),
        ("Give me agricultural weather advice.", {"ADVISORY_QUERY"}),
    ]
    for q, expected_cats in test_cases:
        res = await extract_intent_and_location(q)
        cat = res.get("category")
        assert cat in expected_cats, f"Failed for '{q}': expected one of {expected_cats}, got {cat}"


# ── TEST 3: Voice Action Execution via Backend Pipeline ───────────────────────
async def test_voice_pipeline_classic_action():
    async with AsyncSessionLocal() as db:
        resp = await execute_voice_query_pipeline(
            cleaned_message="Show me the normal screen",
            language="en",
            location="Vijayawada",
            session_id=None,
            lat=16.5062,
            lon=80.6480,
            db=db,
        )
        assert resp.intent == "SWITCH_TO_CLASSIC"
        assert resp.intent_action == "SWITCH_MODE_CLASSIC"
        assert "Classic Mode" in resp.clean_speech_text


async def test_voice_pipeline_voice_action():
    async with AsyncSessionLocal() as db:
        resp = await execute_voice_query_pipeline(
            cleaned_message="Yes, continue with voice",
            language="te",
            location="Vijayawada",
            session_id=None,
            lat=16.5062,
            lon=80.6480,
            db=db,
        )
        assert resp.intent == "SWITCH_TO_VOICE"
        assert resp.intent_action == "SWITCH_MODE_VOICE"
        assert resp.clean_speech_text != ""


async def test_voice_pipeline_shelter_action():
    async with AsyncSessionLocal() as db:
        resp = await execute_voice_query_pipeline(
            cleaned_message="Where can I go if there is a flood?",
            language="en",
            location="Vijayawada",
            session_id=None,
            lat=16.5062,
            lon=80.6480,
            db=db,
        )
        assert resp.intent == "SHELTER_QUERY"
        assert resp.intent_action == "SHOW_SAFE_SHELTERS"
        assert len(resp.clean_speech_text) > 0


async def test_voice_pipeline_weather_query():
    async with AsyncSessionLocal() as db:
        resp = await execute_voice_query_pipeline(
            cleaned_message="What is the weather today?",
            language="en",
            location="Vijayawada",
            session_id=None,
            lat=16.5062,
            lon=80.6480,
            db=db,
        )
        assert resp.intent in {"WEATHER_QUERY", "current"}
        assert resp.weather_data_used is True
        assert resp.weather_data is not None
        assert len(resp.clean_speech_text) > 0


async def main():
    await test_switch_to_voice_variations()
    print("✓ test_switch_to_voice_variations passed")
    await test_switch_to_classic_variations()
    print("✓ test_switch_to_classic_variations passed")
    await test_weather_and_forecast_queries()
    print("✓ test_weather_and_forecast_queries passed")
    await test_voice_pipeline_classic_action()
    print("✓ test_voice_pipeline_classic_action passed")
    await test_voice_pipeline_voice_action()
    print("✓ test_voice_pipeline_voice_action passed")
    await test_voice_pipeline_shelter_action()
    print("✓ test_voice_pipeline_shelter_action passed")
    await test_voice_pipeline_weather_query()
    print("✓ test_voice_pipeline_weather_query passed")
    print("\nALL AUTOMATED TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
