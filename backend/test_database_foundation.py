"""
Comprehensive test suite for Phase 1 Database & Backend Foundation.
Tests schema, constraints, migrations, backward-compatibility, and CRUD endpoints.
"""

import sys
import uuid
import httpx
import asyncio
from sqlalchemy import text
from app.database import engine

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"


async def test_database_schema_and_views():
    print("==================================================================")
    print("TEST 1: PostgreSQL Schema, Views & Constraints")
    print("==================================================================")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
        tables = dict(res.fetchall())

        required_tables = [
            "users", "user_locations", "chat_sessions", "chat_messages",
            "alert_preferences", "device_tokens", "alerts", "locations"
        ]
        for tbl in required_tables:
            assert tbl in tables, f"Missing table {tbl}"
            assert tables[tbl] == "BASE TABLE", f"{tbl} should be BASE TABLE"
            print(f"  ✓ Table '{tbl}' confirmed present as BASE TABLE")

        # Views
        for v in ["chat_history", "weather_alerts"]:
            assert v in tables, f"Missing view {v}"
            assert tables[v] == "VIEW", f"{v} should be VIEW"
            print(f"  ✓ Compatibility view '{v}' confirmed present as VIEW")

        # Check existing chat records were preserved
        c_hist = (await conn.execute(text("SELECT count(*) FROM chat_history"))).scalar()
        c_msg = (await conn.execute(text("SELECT count(*) FROM chat_messages"))).scalar()
        c_sess = (await conn.execute(text("SELECT count(*) FROM chat_sessions"))).scalar()
        print(f"  ✓ Existing data preserved: {c_hist} records in chat_history view, {c_msg} in chat_messages, {c_sess} chat_sessions")
        assert c_hist >= 21, f"Expected at least 21 historical messages, got {c_hist}"
        assert c_hist == c_msg, "chat_history view and chat_messages count mismatch"


async def test_crud_endpoints():
    print("\n==================================================================")
    print("TEST 2: New Foundation CRUD REST Endpoints")
    print("==================================================================")
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Create User
        user_email = f"test_{uuid.uuid4().hex[:8]}@weathergpt.io"
        user_phone = f"+9198{uuid.uuid4().hex[:8]}"
        user_payload = {
            "name": "Ramesh Varma",
            "email": user_email,
            "phone": user_phone,
            "preferred_language": "en"
        }
        res = await client.post("/api/users", json=user_payload)
        assert res.status_code == 201, f"Create user failed: {res.text}"
        user_data = res.json()
        user_id = user_data["id"]
        assert user_data["name"] == "Ramesh Varma"
        assert user_data["preferred_language"] == "en"
        print(f"  ✓ Created user: {user_data['name']} (ID: {user_id})")

        # Duplicate email test -> 409
        dup_res = await client.post("/api/users", json=user_payload)
        assert dup_res.status_code == 409, "Expected 409 Conflict for duplicate email"
        print("  ✓ Duplicate email correctly rejected with 409 Conflict")

        # Get User
        res = await client.get(f"/api/users/{user_id}")
        assert res.status_code == 200
        assert res.json()["email"] == user_email
        print("  ✓ Retrieved user profile successfully")

        # 2. Update Preferred Language -> Telugu
        res = await client.put(f"/api/users/{user_id}/language", json={"preferred_language": "te"})
        assert res.status_code == 200
        assert res.json()["preferred_language"] == "te"
        print("  ✓ Updated preferred language to 'te' (Telugu)")

        # 3. Save User Locations (with is_default toggling)
        loc1 = {
            "location_name": "Vijayawada Farm",
            "latitude": 16.5062,
            "longitude": 80.6480,
            "is_default": True
        }
        res1 = await client.post(f"/api/users/{user_id}/locations", json=loc1)
        assert res1.status_code == 201
        loc1_data = res1.json()
        loc1_id = loc1_data["id"]
        assert loc1_data["is_default"] is True
        print(f"  ✓ Saved primary user location: {loc1_data['location_name']}")

        loc2 = {
            "location_name": "Kakinada Port Office",
            "latitude": 16.9604,
            "longitude": 82.2381,
            "is_default": True
        }
        res2 = await client.post(f"/api/users/{user_id}/locations", json=loc2)
        assert res2.status_code == 201
        loc2_data = res2.json()
        assert loc2_data["is_default"] is True

        # Fetch locations -> verify loc2 is default, loc1 is no longer default
        res = await client.get(f"/api/users/{user_id}/locations")
        assert res.status_code == 200
        locations = res.json()
        assert len(locations) == 2
        assert locations[0]["id"] == loc2_data["id"] and locations[0]["is_default"] is True
        assert locations[1]["id"] == loc1_id and locations[1]["is_default"] is False
        print("  ✓ Saved second location and verified is_default toggle behavior")

        # 4. Chat Session & Messages
        res = await client.post(f"/api/users/{user_id}/chat/sessions", json={"title": "Monsoon Farming Session"})
        assert res.status_code == 201
        session_data = res.json()
        session_id = session_data["id"]
        print(f"  ✓ Created user chat session: '{session_data['title']}' (ID: {session_id})")

        # List user chat sessions
        res = await client.get(f"/api/users/{user_id}/chat/sessions")
        assert res.status_code == 200
        sessions = res.json()
        assert any(s["id"] == session_id for s in sessions)

        # Add messages
        msg1 = {
            "role": "user",
            "content": "రేపు వర్షం పడుతుందా?",
            "language": "te"
        }
        res = await client.post(f"/api/users/{user_id}/chat/sessions/{session_id}/messages", json=msg1)
        assert res.status_code == 201
        assert res.json()["content"] == msg1["content"]

        msg2 = {
            "role": "assistant",
            "content": "అవును, రేపు వర్షం పడే అవకాశం ఉంది.",
            "language": "te",
            "weather_context": {"temp": 28.5, "rain_pct": 75}
        }
        res = await client.post(f"/api/users/{user_id}/chat/sessions/{session_id}/messages", json=msg2)
        assert res.status_code == 201

        # Fetch messages in session
        res = await client.get(f"/api/users/{user_id}/chat/sessions/{session_id}/messages")
        assert res.status_code == 200
        messages = res.json()
        assert len(messages) == 2
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"
        print(f"  ✓ Saved and retrieved {len(messages)} messages for session in Telugu")

        # 5. Alert Preferences (Upsert)
        pref_payload = {
            "location_id": loc1_id,
            "alert_type": "heavy_rain",
            "threshold": 50.0,
            "enabled": True
        }
        res = await client.post(f"/api/users/{user_id}/alert-preferences", json=pref_payload)
        assert res.status_code == 200
        pref_data = res.json()
        assert pref_data["threshold"] == 50.0

        # Update threshold
        pref_payload["threshold"] = 65.0
        res = await client.post(f"/api/users/{user_id}/alert-preferences", json=pref_payload)
        assert res.status_code == 200
        assert res.json()["threshold"] == 65.0

        # List alert preferences
        res = await client.get(f"/api/users/{user_id}/alert-preferences")
        assert res.status_code == 200
        prefs = res.json()
        assert len(prefs) == 1
        assert prefs[0]["threshold"] == 65.0
        print("  ✓ Created and updated user alert preference (upsert working)")

        # 6. Device Tokens (Push Token Registration)
        token_payload = {
            "push_token": f"fcm_token_{uuid.uuid4().hex}_{uuid.uuid4().hex}",
            "platform": "android"
        }
        res = await client.post(f"/api/users/{user_id}/device-tokens", json=token_payload)
        assert res.status_code == 200
        token_data = res.json()
        assert token_data["platform"] == "android"

        # List device tokens
        res = await client.get(f"/api/users/{user_id}/device-tokens")
        assert res.status_code == 200
        tokens = res.json()
        assert len(tokens) == 1
        print("  ✓ Registered and retrieved mobile push device token (android)")


async def test_existing_chat_flow_backward_compatibility():
    print("\n==================================================================")
    print("TEST 3: Backward Compatibility with Existing Chat and Weather Flow")
    print("==================================================================")
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=45.0) as client:
        # Test existing /api/chat endpoint
        chat_req = {
            "session_id": str(uuid.uuid4()),
            "message": "What is the current humidity and temperature in Vijayawada?",
            "language": "en",
            "location": "Vijayawada"
        }
        res = await client.post("/api/chat", json=chat_req)
        assert res.status_code == 200, f"Existing chat failed: {res.text}"
        data = res.json()
        assert data["weather_data_used"] is True
        print("  ✓ Existing /api/chat route successfully saved into migrated chat_messages table")

        # Test existing /api/chat/history/{session_id} route
        res = await client.get(f"/api/chat/history/{chat_req['session_id']}")
        assert res.status_code == 200
        history = res.json()
        assert len(history) == 2  # user + assistant
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"
        print(f"  ✓ Existing /api/chat/history route retrieved {len(history)} messages from migrated table")


async def main():
    try:
        await test_database_schema_and_views()
        await test_crud_endpoints()
        await test_existing_chat_flow_backward_compatibility()
        print("\n==================================================================")
        print("ALL DATABASE FOUNDATION AND COMPATIBILITY TESTS PASSED!")
        print("==================================================================")
    except Exception as e:
        print(f"\n❌ TEST SUITE FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
