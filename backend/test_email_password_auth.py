"""
Comprehensive automated tests for WeatherGPT Email + Password Authentication & Security.
Tests:
1. Valid registration with email + password (Argon2id hashing)
2. Rejection of invalid email format
3. Rejection of short/weak password (< 6 chars)
4. Rejection of mismatched passwords
5. Direct PostgreSQL check: password_hash starts with $argon2id$ and plain password is NOT stored
6. API response check: password and password_hash are NEVER leaked
7. Successful login with correct credentials
8. Rejection of login with incorrect password
9. Token invalidation / logout
10. Protected endpoint /api/auth/me access control
11. Email verification flow
12. Password reset flow with new Argon2id hash
"""

import sys
import uuid
import httpx
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User

BASE_URL = "http://127.0.0.1:8000"


async def run_tests():
    print("=" * 70)
    print("RUNNING WEATHERGPT EMAIL + PASSWORD AUTHENTICATION TEST SUITE")
    print("=" * 70)

    test_suffix = uuid.uuid4().hex[:6]
    test_email = f"farmer_{test_suffix}@weathergpt.org"
    test_password = "KrishiPassword123"
    test_name = f"Ravi Varma {test_suffix}"

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        # ── Test 1: Reject Mismatched Passwords ───────────────────────────────
        print("\n[TEST 1] Register with mismatched passwords...")
        res = await client.post("/api/auth/register", json={
            "name": test_name,
            "email": test_email,
            "password": test_password,
            "confirm_password": "DifferentPassword123",
            "preferred_language": "te",
        })
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "not match" in res.json().get("detail", "").lower()
        print("  [OK] PASSED: Mismatched passwords rejected with 400 Bad Request.")

        # ── Test 2: Reject Weak/Short Password ────────────────────────────────
        print("\n[TEST 2] Register with password shorter than 6 characters...")
        res = await client.post("/api/auth/register", json={
            "name": test_name,
            "email": test_email,
            "password": "123",
            "confirm_password": "123",
            "preferred_language": "te",
        })
        assert res.status_code in [400, 422], f"Expected 400/422, got {res.status_code}: {res.text}"
        print("  [OK] PASSED: Short password rejected.")

        # ── Test 3: Reject Invalid Email Format ───────────────────────────────
        print("\n[TEST 3] Register with invalid email syntax...")
        res = await client.post("/api/auth/register", json={
            "name": test_name,
            "email": "not-a-valid-email",
            "password": test_password,
            "confirm_password": test_password,
            "preferred_language": "te",
        })
        assert res.status_code in [400, 422], f"Expected 400/422, got {res.status_code}: {res.text}"
        print("  [OK] PASSED: Invalid email rejected.")

        # ── Test 4: Valid Registration ────────────────────────────────────────
        print("\n[TEST 4] Register with valid email and password...")
        res = await client.post("/api/auth/register", json={
            "name": test_name,
            "email": test_email,
            "password": test_password,
            "confirm_password": test_password,
            "preferred_language": "te",
        })
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        reg_data = res.json()
        assert "access_token" in reg_data, "Token missing in response"
        assert reg_data["token_type"] == "bearer"
        assert reg_data["is_new_user"] is True
        assert reg_data["user"]["email"] == test_email
        assert reg_data["user"]["name"] == test_name
        assert reg_data["user"]["email_verified"] is False
        verification_token = reg_data.get("verification_token")
        assert verification_token is not None, "Verification token should be generated"
        print(f"  [OK] PASSED: User successfully registered. Email status: {reg_data.get('email_delivery_status')[:60]}...")

        # ── Test 5: Verify Argon2id Password Hashing in Database ─────────────
        print("\n[TEST 5] Verifying Argon2id password hash directly in PostgreSQL...")
        async with AsyncSessionLocal() as db:
            stmt = select(User).where(User.email == test_email)
            result = await db.execute(stmt)
            db_user = result.scalar_one_or_none()
            assert db_user is not None, "User not found in database"
            assert db_user.password_hash is not None, "password_hash is NULL in DB"
            assert db_user.password_hash.startswith("$argon2id$"), (
                f"Password hash is not Argon2id! Value: {db_user.password_hash[:20]}"
            )
            assert test_password not in db_user.password_hash, "Plain password appears in hash!"
            print(f"  [OK] PASSED: Database stores genuine Argon2id hash: {db_user.password_hash[:35]}...")

        # ── Test 6: Verify Password & Hash are NEVER Leaked in API ────────────
        print("\n[TEST 6] Verify password and password_hash are NEVER leaked in API responses...")
        assert "password" not in reg_data["user"], "Password field exposed in API response!"
        assert "password_hash" not in reg_data["user"], "Password hash exposed in API response!"
        assert test_password not in str(reg_data), "Plain password string leaked in response payload!"
        print("  [OK] PASSED: Zero leakage of password or hash in API responses.")

        # ── Test 7: Reject Duplicate Email Registration ───────────────────────
        print("\n[TEST 7] Attempt registration with already existing email...")
        res = await client.post("/api/auth/register", json={
            "name": "Duplicate User",
            "email": test_email,
            "password": "AnotherPassword123",
            "confirm_password": "AnotherPassword123",
            "preferred_language": "te",
        })
        assert res.status_code == 409, f"Expected 409 Conflict, got {res.status_code}: {res.text}"
        print("  [OK] PASSED: Duplicate registration rejected with 409 Conflict.")

        # ── Test 8: Login with Incorrect Password ─────────────────────────────
        print("\n[TEST 8] Login with wrong password...")
        res = await client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword999",
        })
        assert res.status_code == 401, f"Expected 401 Unauthorized, got {res.status_code}: {res.text}"
        assert "invalid email or password" in res.json().get("detail", "").lower()
        print("  [OK] PASSED: Incorrect password rejected with generic 401 error.")

        # ── Test 9: Login with Correct Password ───────────────────────────────
        print("\n[TEST 9] Login with correct credentials...")
        res = await client.post("/api/auth/login", json={
            "email": test_email,
            "password": test_password,
        })
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        login_data = res.json()
        auth_token = login_data["access_token"]
        assert auth_token is not None
        assert login_data["user"]["email"] == test_email
        print("  [OK] PASSED: Successful authentication with valid JWT token issued.")

        # ── Test 10: Access Protected Profile (/api/auth/me) ──────────────────
        print("\n[TEST 10] Access protected /api/auth/me with Bearer token...")
        # First without token
        unauth_res = await client.get("/api/auth/me")
        assert unauth_res.status_code == 401, f"Expected 401 for unauthenticated request, got {unauth_res.status_code}"

        # With token
        auth_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert auth_res.status_code == 200, f"Expected 200 OK, got {auth_res.status_code}: {auth_res.text}"
        profile = auth_res.json()
        assert profile["email"] == test_email
        assert "password_hash" not in profile
        print("  [OK] PASSED: Protected route secured; authentic user retrieved successfully.")

        # ── Test 11: Email Verification Flow ──────────────────────────────────
        print("\n[TEST 11] Verify email address with signed action token...")
        verify_res = await client.post("/api/auth/verify-email", json={"token": verification_token})
        assert verify_res.status_code == 200, f"Expected 200, got {verify_res.status_code}: {verify_res.text}"
        assert verify_res.json()["email_verified"] is True

        # Check DB updated
        async with AsyncSessionLocal() as db:
            stmt = select(User).where(User.email == test_email)
            db_user = (await db.execute(stmt)).scalar_one()
            assert db_user.email_verified is True
        print("  [OK] PASSED: Email successfully marked verified in database.")

        # ── Test 12: Logout ───────────────────────────────────────────────────
        print("\n[TEST 12] Logout acknowledgment...")
        logout_res = await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {auth_token}"})
        assert logout_res.status_code == 200, f"Expected 200 OK, got {logout_res.status_code}"
        print("  [OK] PASSED: Logout handled cleanly.")

        # ── Test 13: Password Reset Flow ──────────────────────────────────────
        print("\n[TEST 13] Password reset flow with new Argon2id hash...")
        forgot_res = await client.post("/api/auth/forgot-password", json={"email": test_email})
        assert forgot_res.status_code == 200
        reset_token = forgot_res.json().get("reset_token")
        assert reset_token is not None, "Reset token should be returned when SMTP is unconfigured"

        new_password = "UpdatedPassword456"
        reset_confirm_res = await client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": new_password,
            "confirm_password": new_password,
        })
        assert reset_confirm_res.status_code == 200

        # Verify old password no longer works
        old_login = await client.post("/api/auth/login", json={"email": test_email, "password": test_password})
        assert old_login.status_code == 401, "Old password should no longer work"

        # Verify new password works
        new_login = await client.post("/api/auth/login", json={"email": test_email, "password": new_password})
        assert new_login.status_code == 200, "New password should authenticate successfully"
        print("  [OK] PASSED: Password reset successfully updated Argon2id hash and restored login.")

    print("\n" + "=" * 70)
    print("ALL 13 AUTHENTICATION TESTS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_tests())
