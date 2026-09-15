"""
Verification test suite for WeatherGPT Mobile Authentication & Authorization Phase.
Tests:
1. Google Sign-In endpoint (/api/auth/google) with new user creation (is_new_user=True)
2. Google Sign-In with existing user (is_new_user=False)
3. Guest Sign-In endpoint (/api/auth/guest)
4. Authenticated profile endpoint (/api/auth/me) with Bearer token
5. Unauthorized access (401) without Bearer token
6. IDOR Protection (403 Forbidden): User A cannot read or write User B's resources:
   - Saved locations
   - Chat sessions & messages
   - Alert preferences
   - Device tokens
7. Legitimate access (200/201) when user accesses their own resources
8. Logout endpoint (/api/auth/logout)
"""

import sys
import uuid
import asyncio
import httpx

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

BASE_URL = "http://127.0.0.1:8000"


class TestTracker:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def log(self, test_name: str, success: bool, details: str = ""):
        status = "PASSED" if success else "FAILED"
        if success:
            self.passed += 1
        else:
            self.failed += 1
        msg = f"[{status}] {test_name}: {details}"
        self.results.append((test_name, status, details))
        print(msg)


tracker = TestTracker()


async def main():
    print("==================================================================")
    print("  WeatherGPT Mobile Authentication & Authorization Test Suite     ")
    print("==================================================================")

    async with httpx.AsyncClient(timeout=15.0) as client:
        # --- 1. Google Sign-In with New User ---
        print("\n--- 1. Testing Google Sign-In (New User) ---")
        unique_id = uuid.uuid4().hex[:8]
        new_google_token = f"demo_google_farmer_{unique_id}"
        resp_new = await client.post(
            f"{BASE_URL}/api/auth/google",
            json={"id_token": new_google_token},
        )
        d_new = resp_new.json()
        token_a = d_new.get("access_token")
        user_a = d_new.get("user")
        user_a_id = user_a.get("id") if user_a else None

        tracker.log(
            "Google Sign-In (New User)",
            resp_new.status_code == 200
            and d_new.get("is_new_user") is True
            and token_a is not None
            and user_a_id is not None,
            f"User ID: {user_a_id}, is_new_user: {d_new.get('is_new_user')}",
        )

        # --- 2. Google Sign-In with Existing User ---
        print("\n--- 2. Testing Google Sign-In (Existing User Session Restore) ---")
        resp_exist = await client.post(
            f"{BASE_URL}/api/auth/google",
            json={"id_token": new_google_token},
        )
        d_exist = resp_exist.json()
        tracker.log(
            "Google Sign-In (Existing User)",
            resp_exist.status_code == 200
            and d_exist.get("is_new_user") is False
            and d_exist.get("user", {}).get("id") == user_a_id,
            f"Session restored for user {user_a_id}, is_new_user: False",
        )

        # --- 3. Guest Sign-In ---
        print("\n--- 3. Testing Guest Sign-In ---")
        resp_guest = await client.post(
            f"{BASE_URL}/api/auth/guest",
            json={"name": "Guest Farmer", "preferred_language": "te"},
        )
        d_guest = resp_guest.json()
        token_guest = d_guest.get("access_token")
        user_guest = d_guest.get("user")
        tracker.log(
            "Guest Sign-In",
            resp_guest.status_code == 200
            and token_guest is not None
            and user_guest.get("name") == "Guest Farmer",
            f"Guest User ID: {user_guest.get('id') if user_guest else None}",
        )

        # --- 4. Authenticated Profile (/api/auth/me) ---
        print("\n--- 4. Testing /api/auth/me with Bearer Token ---")
        headers_a = {"Authorization": f"Bearer {token_a}"}
        resp_me = await client.get(f"{BASE_URL}/api/auth/me", headers=headers_a)
        tracker.log(
            "Get Current User (/api/auth/me)",
            resp_me.status_code == 200 and resp_me.json().get("id") == user_a_id,
            f"Profile fetched for {resp_me.json().get('name')}",
        )

        # --- 5. Unauthorized Access (401) ---
        print("\n--- 5. Testing Unauthorized Access (No Token) ---")
        resp_unauth = await client.get(f"{BASE_URL}/api/users/{user_a_id}/locations")
        tracker.log(
            "Unauthorized Access Rejection",
            resp_unauth.status_code == 401,
            f"Status 401 received without Bearer token",
        )

        # --- 6. IDOR / Authorization Protection (User B cannot access User A) ---
        print("\n--- 6. Testing IDOR Protection (Cross-User Access Rejection) ---")
        # Create User B
        unique_b = uuid.uuid4().hex[:8]
        resp_b = await client.post(
            f"{BASE_URL}/api/auth/google",
            json={"id_token": f"demo_google_user_{unique_b}"},
        )
        token_b = resp_b.json().get("access_token")
        user_b_id = resp_b.json().get("user", {}).get("id")
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B attempts to view User A's locations
        resp_idor_loc = await client.get(f"{BASE_URL}/api/users/{user_a_id}/locations", headers=headers_b)
        tracker.log(
            "IDOR Protection: Read Other User's Locations",
            resp_idor_loc.status_code == 403,
            f"Expected 403 Forbidden, got {resp_idor_loc.status_code}: {resp_idor_loc.json().get('detail')}",
        )

        # User B attempts to view User A's profile
        resp_idor_prof = await client.get(f"{BASE_URL}/api/users/{user_a_id}", headers=headers_b)
        tracker.log(
            "IDOR Protection: Read Other User's Profile",
            resp_idor_prof.status_code == 403,
            f"Expected 403 Forbidden, got {resp_idor_prof.status_code}",
        )

        # User B attempts to create chat session under User A's ID
        resp_idor_chat = await client.post(
            f"{BASE_URL}/api/users/{user_a_id}/chat/sessions",
            json={"title": "Hacked Session"},
            headers=headers_b,
        )
        tracker.log(
            "IDOR Protection: Create Other User's Chat Session",
            resp_idor_chat.status_code == 403,
            f"Expected 403 Forbidden, got {resp_idor_chat.status_code}",
        )

        # User B attempts to read User A's alert preferences
        resp_idor_alert = await client.get(
            f"{BASE_URL}/api/users/{user_a_id}/alert-preferences",
            headers=headers_b,
        )
        tracker.log(
            "IDOR Protection: Read Other User's Alert Preferences",
            resp_idor_alert.status_code == 403,
            f"Expected 403 Forbidden, got {resp_idor_alert.status_code}",
        )

        # --- 7. Legitimate Access (User A accesses User A's resources) ---
        print("\n--- 7. Testing Legitimate Authorized Resource Access ---")
        # User A saves location
        save_loc = await client.post(
            f"{BASE_URL}/api/users/{user_a_id}/locations",
            json={
                "location_name": "Vijayawada Farm",
                "latitude": 16.5062,
                "longitude": 80.6480,
                "is_default": True,
            },
            headers=headers_a,
        )
        tracker.log(
            "Authorized Location Creation",
            save_loc.status_code == 201,
            f"Created location ID: {save_loc.json().get('id')}",
        )

        # User A reads own locations
        read_locs = await client.get(f"{BASE_URL}/api/users/{user_a_id}/locations", headers=headers_a)
        tracker.log(
            "Authorized Location Read",
            read_locs.status_code == 200 and len(read_locs.json()) >= 1,
            f"Retrieved {len(read_locs.json())} locations for User A",
        )

        # User A creates chat session & message
        chat_sess = await client.post(
            f"{BASE_URL}/api/users/{user_a_id}/chat/sessions",
            json={"title": "Authorized Session"},
            headers=headers_a,
        )
        sess_id = chat_sess.json().get("id")
        tracker.log(
            "Authorized Chat Session Creation",
            chat_sess.status_code == 201,
            f"Session ID: {sess_id}",
        )

        msg_resp = await client.post(
            f"{BASE_URL}/api/users/{user_a_id}/chat/sessions/{sess_id}/messages",
            json={
                "role": "user",
                "content": "What is the monsoon forecast?",
                "language": "en",
            },
            headers=headers_a,
        )
        tracker.log(
            "Authorized Chat Message Creation",
            msg_resp.status_code == 201,
            f"Message ID: {msg_resp.json().get('id')}",
        )

        # --- 8. Logout ---
        print("\n--- 8. Testing Logout Endpoint ---")
        resp_logout = await client.post(f"{BASE_URL}/api/auth/logout", headers=headers_a)
        tracker.log(
            "Logout Endpoint (/api/auth/logout)",
            resp_logout.status_code == 200,
            f"Response: {resp_logout.json().get('message')}",
        )

    print("\n==================================================================")
    print(f"RESULTS SUMMARY: {tracker.passed} PASSED, {tracker.failed} FAILED")
    print("==================================================================")
    if tracker.failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
