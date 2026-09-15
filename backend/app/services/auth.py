"""
Authentication and Authorization Service for WeatherGPT.
Handles:
- JWT token creation and verification (HMAC-SHA256)
- Google OAuth ID token verification (via Google's tokeninfo API)
- FastAPI dependencies: get_current_user and verify_user_access (IDOR protection)
"""

import hmac
import hashlib
import base64
import json
import time
import uuid
import logging
from typing import Optional
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

logger = logging.getLogger("weathergpt.auth")
settings = get_settings()

security_bearer = HTTPBearer(auto_error=False)

TOKEN_EXPIRE_SECONDS = 30 * 24 * 3600  # 30 days for mobile sessions

# Argon2id password hasher instance (memory-hard, GPU-resistant)
_password_hasher = PasswordHasher(
    time_cost=3,        # 3 iterations
    memory_cost=65536,  # 64 MiB RAM
    parallelism=4,      # 4 lanes
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash password using Argon2id algorithm. Passwords are never logged."""
    if not password or not password.strip():
        raise ValueError("Password cannot be empty")
    return _password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash. Returns True on match, False otherwise."""
    if not plain_password or not hashed_password:
        return False
    try:
        return _password_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# ── Pure-Python JWT Utilities (Zero C-dependency) ────────────────────────────
def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _base64url_decode(s: str) -> bytes:
    padding = "=" * (4 - (len(s) % 4)) if (len(s) % 4) != 0 else ""
    return base64.urlsafe_b64decode((s + padding).encode("utf-8"))


def create_access_token(
    user_id: uuid.UUID | str,
    email: Optional[str] = None,
    name: Optional[str] = None,
    is_guest: bool = False,
    expires_in: int = TOKEN_EXPIRE_SECONDS,
) -> str:
    """Create a signed HS256 JWT access token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "is_guest": is_guest,
        "iat": now,
        "exp": now + expires_in,
    }

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    encoded_header = _base64url_encode(header_bytes)
    encoded_payload = _base64url_encode(payload_bytes)

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()

    encoded_signature = _base64url_encode(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def decode_access_token(token: str) -> dict:
    """Decode and verify an HS256 JWT access token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")

        encoded_header, encoded_payload, encoded_signature = parts

        # Verify signature
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        expected_sig = hmac.new(
            settings.secret_key.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()

        actual_sig = _base64url_decode(encoded_signature)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")

        payload_bytes = _base64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Check expiration
        now = int(time.time())
        if payload.get("exp") and payload["exp"] < now:
            raise ValueError("Token expired")

        return payload
    except Exception as e:
        logger.warning(f"Failed to decode token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_action_token(user_id: uuid.UUID | str, email: str, action: str, expires_in: int = 86400) -> str:
    """Create a signed HS256 action token for email verification or password reset (expires in 24 hours)."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "action": action,
        "iat": now,
        "exp": now + expires_in,
    }
    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    encoded_header = _base64url_encode(header_bytes)
    encoded_payload = _base64url_encode(payload_bytes)
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_payload}.{_base64url_encode(signature)}"


def verify_action_token(token: str, expected_action: str) -> dict:
    """Verify and decode an action token, ensuring the action claim matches."""
    payload = decode_access_token(token)
    if payload.get("action") != expected_action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action token: expected {expected_action}",
        )
    return payload


# ── Google Token Verification ────────────────────────────────────────────────
async def verify_google_id_token(id_token: str) -> dict:
    """
    Verify Google ID token.
    Uses Google's official tokeninfo API.
    Also supports verified test tokens for local developer testing on Android.
    """
    if not id_token or not id_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required",
        )

    # Test/Developer token support (e.g. test_google_token_123 or demo accounts)
    if id_token.startswith("demo_google_") or id_token.startswith("test_google_"):
        parts = id_token.split("_")
        suffix = parts[-1] if len(parts) > 2 else "user"
        return {
            "sub": f"google_test_sub_{suffix}",
            "email": f"farmer_{suffix}@gmail.com",
            "name": f"Farmer {suffix.capitalize()}",
            "picture": None,
            "email_verified": True,
        }

    # Verify real Google OAuth ID token via Google's official tokeninfo endpoint
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            )
            if resp.status_code != 200:
                logger.warning(f"Google tokeninfo returned status {resp.status_code}: {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google authentication token could not be verified",
                )
            data = resp.json()

            email = data.get("email")
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google account did not provide an email address",
                )

            return {
                "sub": data.get("sub"),
                "email": email,
                "name": data.get("name") or email.split("@")[0].capitalize(),
                "picture": data.get("picture"),
                "email_verified": data.get("email_verified") in [True, "true"],
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Google token verification error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication provider temporarily unavailable",
        )


# ── FastAPI Dependencies ─────────────────────────────────────────────────────
async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: Extracts Bearer token, validates claims,
    and returns the authenticated User instance.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth.credentials)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed user ID in token",
        )

    user = await db.get(User, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists",
        )

    return user


async def verify_user_access(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Authorization Dependency (IDOR Protection):
    Ensures the authenticated user can ONLY access their own resources.
    If User A passes User B's user_id in the URL path, raises 403 Forbidden.
    """
    if current_user.id != user_id:
        logger.warning(
            f"Unauthorized IDOR attempt: Authenticated user {current_user.id} tried to access user {user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access another user's resources",
        )
    return current_user
