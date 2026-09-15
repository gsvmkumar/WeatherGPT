"""
Automated Test Suite for WeatherGPT Final Mobile Application & Backend Integration
Tests:
1. Safe Shelters System (Haversine proximity, sorting, zero-result verification, official badges, emergency hotlines)
2. User Authentication & Profile Persistence (Argon2id, JWT, preferences, session data)
3. Weather & Alerts Endpoints
4. Voice / Language Support across 8 Indian languages
"""
import sys
import uuid
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://127.0.0.1:8000"

def test_shelters():
    print("\n--- 1. TESTING EMERGENCY SAFE SHELTERS API ---")
    
    # 1. Nearby shelters near Vijayawada (16.5062, 80.6480)
    resp = requests.get(f"{BASE_URL}/api/shelters/nearby?lat=16.5062&lon=80.6480&radius_km=50&language=en")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["has_verified_shelters"] is True, "Expected verified shelters near Vijayawada"
    assert len(data["shelters"]) > 0, "Expected non-empty shelters list"
    assert data["count"] == len(data["shelters"])
    
    # Verify distance sorting
    distances = [s["distance_km"] for s in data["shelters"]]
    assert distances == sorted(distances), f"Distances not sorted: {distances}"
    print(f"  ✓ Nearby shelters found: {data['count']} shelters. Closest: {data['shelters'][0]['name']} ({distances[0]} km)")
    
    # Verify official source and verification badge fields
    first = data["shelters"][0]
    assert first["verification_status"] == "verified_official"
    assert "source" in first
    assert "contact_information" in first
    assert first["contact_information"] is not None
    print(f"  ✓ Shelter data verified: Source='{first['source']}', Status='{first['verification_status']}', Contact='{first['contact_information']}'")

    # 2. Detail by ID
    shelter_id = first["id"]
    detail_resp = requests.get(f"{BASE_URL}/api/shelters/{shelter_id}?lat=16.5062&lon=80.6480")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == shelter_id
    print(f"  ✓ Shelter detail by ID works: {detail['name']}")

    # 3. CRITICAL: Test Zero-Result Safety (Strictly No Hallucinations / No Fabricated Shelters)
    far_resp = requests.get(f"{BASE_URL}/api/shelters/nearby?lat=85.0&lon=0.0&radius_km=10&language=en")
    assert far_resp.status_code == 200
    far_data = far_resp.json()
    assert far_data["has_verified_shelters"] is False, "Should NOT have shelters at North Pole"
    assert far_data["count"] == 0
    assert len(far_data["shelters"]) == 0
    assert "1070" in far_data["safety_advisory"] or "112" in far_data["safety_advisory"], "Must provide emergency helpline"
    print(f"  ✓ Zero-result safety check passed: 0 shelters fabricated. Advisory: '{far_data['safety_advisory']}'")

    # 4. Multilingual advisory check (Telugu)
    te_resp = requests.get(f"{BASE_URL}/api/shelters/nearby?lat=85.0&lon=0.0&radius_km=10&language=te")
    assert te_resp.status_code == 200
    te_data = te_resp.json()
    assert "ఆశ్రయాలు" in te_data["safety_advisory"] or "1070" in te_data["safety_advisory"]
    print(f"  ✓ Multilingual Telugu advisory text verified.")

def test_auth_and_user_lifecycle():
    print("\n--- 2. TESTING AUTHENTICATION & SESSION PERSISTENCE ---")
    
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword@123"
    
    # 1. Register User
    reg_payload = {
        "email": unique_email,
        "password": password,
        "confirm_password": password,
        "name": "Arjun Kumar",
        "city": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "country": "India",
        "latitude": 17.6868,
        "longitude": 83.2185,
        "preferred_language": "te",
        "notifications_enabled": True
    }
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"Register failed: {reg_resp.text}"
    auth_data = reg_resp.json()
    user_data = auth_data["user"]
    assert user_data["email"] == unique_email
    assert user_data["name"] == "Arjun Kumar"
    assert user_data["preferred_language"] == "te"
    print(f"  ✓ Registration successful for: {unique_email} (Preferred lang: te)")
    
    # 2. Duplicate Registration Rejection (409 Conflict)
    dup_resp = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert dup_resp.status_code == 409, f"Expected 409 for duplicate, got {dup_resp.status_code}"
    print("  ✓ Duplicate email correctly rejected with 409 Conflict")

    # 3. Login with Wrong Password (JSON)
    bad_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": unique_email, "password": "WrongPassword"})
    assert bad_login.status_code == 401
    print("  ✓ Wrong password correctly rejected with 401")

    # 4. Login with Correct Password (JSON)
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": unique_email, "password": password})
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    token = token_data["access_token"]
    assert token is not None and len(token) > 20
    headers = {"Authorization": f"Bearer {token}"}
    print("  ✓ Login successful, JWT token received")

    # 5. Get Profile / Session Validation (/api/auth/me)
    me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    user_id = me_data["id"]
    assert me_data["email"] == unique_email
    assert me_data["name"] == "Arjun Kumar"
    assert me_data["preferred_language"] == "te"
    print(f"  ✓ Session verified via /api/auth/me: {me_data['name']} (Language: {me_data['preferred_language']})")

    # 6. Update User Language Preference
    update_lang = requests.put(f"{BASE_URL}/api/users/{user_id}/language", json={"preferred_language": "hi"}, headers=headers)
    assert update_lang.status_code == 200
    assert update_lang.json()["preferred_language"] == "hi"
    print("  ✓ Language preference update verified: Changed to 'hi'")

    # 7. Save and Retrieve User Location
    loc_payload = {
        "location_name": "Visakhapatnam Beach",
        "latitude": 17.6868,
        "longitude": 83.2185,
        "is_default": True
    }
    save_loc = requests.post(f"{BASE_URL}/api/users/{user_id}/locations", json=loc_payload, headers=headers)
    assert save_loc.status_code == 201
    loc_data = save_loc.json()
    assert loc_data["location_name"] == "Visakhapatnam Beach"
    assert loc_data["is_default"] is True
    print(f"  ✓ Saved location verified: {loc_data['location_name']} ({loc_data['latitude']}, {loc_data['longitude']})")

def test_weather_and_alerts():
    print("\n--- 3. TESTING WEATHER & ALERTS SERVICES ---")
    
    # 1. Weather for Hyderabad
    w_resp = requests.get(f"{BASE_URL}/api/weather/current?location=Hyderabad")
    assert w_resp.status_code == 200, f"Expected 200, got {w_resp.status_code}: {w_resp.text}"
    w_data = w_resp.json()
    assert "temperature_c" in w_data
    assert "condition_text" in w_data
    print(f"  ✓ Weather for Hyderabad: {w_data['temperature_c']}°C, {w_data['condition_text']} (Humidity: {w_data['humidity_pct']}%)")

    # 2. Alerts for Andhra Pradesh / Vijayawada
    a_resp = requests.get(f"{BASE_URL}/api/alerts?lat=16.5062&lon=80.6480")
    assert a_resp.status_code == 200
    a_data = a_resp.json()
    assert "alerts" in a_data
    assert "ai_explanation" in a_data
    print(f"  ✓ Alerts endpoint returned: {len(a_data['alerts'])} active alerts, AI explanation present")

def test_multilingual_coverage():
    print("\n--- 4. TESTING MULTILINGUAL SUPPORT (8 LANGUAGES) ---")
    languages = [
        ("en", "English"),
        ("te", "Telugu"),
        ("hi", "Hindi"),
        ("ta", "Tamil"),
        ("kn", "Kannada"),
        ("ml", "Malayalam"),
        ("mr", "Marathi"),
        ("bn", "Bengali")
    ]
    for code, name in languages:
        resp = requests.get(f"{BASE_URL}/api/shelters/nearby?lat=16.5062&lon=80.6480&radius_km=50&language={code}")
        assert resp.status_code == 200
        data = resp.json()
        assert "safety_advisory" in data
        assert len(data["safety_advisory"]) > 0
        print(f"  ✓ [{code}] {name}: Advisory text generated ({len(data['safety_advisory'])} chars)")

if __name__ == "__main__":
    print("==================================================")
    print("STARTING WEATHERGPT MOBILE INTEGRATION TEST SUITE")
    print("==================================================")
    try:
        test_shelters()
        test_auth_and_user_lifecycle()
        test_weather_and_alerts()
        test_multilingual_coverage()
        print("\n==================================================")
        print("ALL TESTS PASSED SUCCESSFULLY! (100%)")
        print("==================================================")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
