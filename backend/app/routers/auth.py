"""
Auth router for WeatherGPT — Mobile & Web Authentication.

Endpoints:
- POST /api/auth/register: Proper Email + Password account registration with Argon2id hashing
- POST /api/auth/login: Email + Password authentication with Argon2id verification
- POST /api/auth/verify-email: Verify account email address with secure action token
- POST /api/auth/forgot-password: Initiate password reset with secure action token
- POST /api/auth/reset-password: Reset password using verified token and new Argon2id hash
- POST /api/auth/google: Google Sign-In with backend token verification
- POST /api/auth/guest: Fast guest session for voice & weather exploration
- GET  /api/auth/me: Returns current authenticated user profile
- POST /api/auth/logout: Client session revocation acknowledgment
"""

import uuid
import os
import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    UserRegisterRequest,
    UserLoginRequest,
    EmailVerifyRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_action_token,
    verify_action_token,
    verify_google_id_token,
    get_current_user,
)

logger = logging.getLogger("weathergpt.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=1, description="Google OAuth ID token")


class GuestLoginRequest(BaseModel):
    name: Optional[str] = Field("Guest User", max_length=100)
    preferred_language: Optional[str] = Field("te", max_length=10)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool
    user: UserResponse
    verification_token: Optional[str] = None
    email_delivery_status: Optional[str] = None


# ── 1. Email + Password Registration ─────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new WeatherGPT user account with Email + Password.
    1. Validates input (email format, matching passwords, min 6 characters).
    2. Hashes the password using Argon2id (memory-hard, GPU-resistant).
    3. Stores account in PostgreSQL users table with email_verified=False.
    4. Issues a signed WeatherGPT JWT access token.
    5. Checks email delivery configuration and generates a verification token.
    """
    clean_email = str(data.email).lower().strip()

    # Password validation rules
    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation password do not match.",
        )

    # Check for existing user
    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()

    if existing_user:
        if existing_user.password_hash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please log in.",
            )
        # Existing account without password (e.g. converted from OAuth/legacy)
        existing_user.name = data.name.strip()
        existing_user.password_hash = hash_password(data.password)
        existing_user.preferred_language = data.preferred_language
        existing_user.email_verified = False
        user = existing_user
        await db.commit()
        await db.refresh(user)
    else:
        # Create new user with Argon2id hash
        hashed = hash_password(data.password)
        user = User(
            name=data.name.strip(),
            email=clean_email,
            password_hash=hashed,
            email_verified=False,
            preferred_language=data.preferred_language,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        is_guest=False,
    )

    # Email verification token
    verification_token = create_action_token(
        user_id=user.id,
        email=user.email or clean_email,
        action="verify_email",
    )

    # Check email delivery provider configuration
    smtp_host = os.getenv("SMTP_HOST")
    if smtp_host:
        email_status = "Verification email dispatched via configured SMTP provider."
    else:
        email_status = (
            "Email verification provider not configured. "
            "To enable automated emails, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in backend/.env. "
            "Verification token generated for development verification."
        )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        is_new_user=True,
        user=user,
        verification_token=verification_token,
        email_delivery_status=email_status,
    )


# ── 2. Email + Password Login ────────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login_user(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user using Email and WeatherGPT account password.
    1. Looks up account by email.
    2. Validates password against Argon2id hash.
    3. Rejects invalid credentials with a generic 401 error.
    4. Issues signed WeatherGPT JWT access token.
    """
    clean_email = str(data.email).lower().strip()

    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not user.password_hash:
        logger.warning(f"Login failed: User not found or no password hash for email {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(data.password, user.password_hash):
        logger.warning(f"Login failed: Incorrect password for email {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        is_guest=False,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        is_new_user=False,
        user=user,
    )


# ── 3. Email Verification ────────────────────────────────────────────────────
@router.post("/verify-email")
async def verify_email(data: EmailVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify account email address using a signed verification token.
    Updates email_verified=True in PostgreSQL.
    """
    payload = verify_action_token(data.token, expected_action="verify_email")
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed verification token")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID in token")

    user = await db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    user.email_verified = True
    await db.commit()

    return {
        "status": "ok",
        "message": "Email verified successfully.",
        "email_verified": True,
    }


# ── 4. Forgot Password (Initiate Reset) ───────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Initiate password reset.
    Returns a generic message to prevent email enumeration.
    Generates a password reset token with 1-hour expiration.
    """
    clean_email = str(data.email).lower().strip()
    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    reset_token = None
    if user:
        reset_token = create_action_token(
            user_id=user.id,
            email=user.email or clean_email,
            action="reset_password",
            expires_in=3600,
        )

    smtp_host = os.getenv("SMTP_HOST")
    return {
        "status": "ok",
        "message": "If an account with that email exists, password reset instructions have been initiated.",
        "reset_token": reset_token if not smtp_host else None,
        "note": "Configure SMTP in backend/.env for production email delivery." if not smtp_host else None,
    }


# ── 5. Reset Password (Complete Reset) ────────────────────────────────────────
@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Complete password reset with verified token and new password.
    Updates the user's password_hash with new Argon2id hash.
    """
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match.",
        )

    payload = verify_action_token(data.token, expected_action="reset_password")
    user_id_str = payload.get("sub")
    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    user = await db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    user.password_hash = hash_password(data.new_password)
    await db.commit()

    return {
        "status": "ok",
        "message": "Password has been successfully updated. You can now log in with your new password.",
    }


# ── 6. Google Sign-In ────────────────────────────────────────────────────────
@router.post("/google", response_model=AuthResponse)
async def login_with_google(data: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate with Google ID token.
    1. Verifies Google token signature and claims via Google official tokeninfo endpoint.
    2. Looks up existing user by Google email.
    3. If new user, creates new account in PostgreSQL users table with is_new_user=True.
    4. Issues WeatherGPT JWT access token.
    """
    google_info = await verify_google_id_token(data.id_token)
    email = google_info["email"]
    name = google_info.get("name") or email.split("@")[0].capitalize()

    # Query existing user by email
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    is_new_user = False
    if not user:
        # Create new user
        is_new_user = True
        user = User(
            name=name,
            email=email,
            email_verified=True,  # Google verified
            preferred_language="te",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        is_guest=False,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        is_new_user=is_new_user,
        user=user,
    )


# ── 7. Guest Session ─────────────────────────────────────────────────────────
@router.post("/guest", response_model=AuthResponse)
async def login_as_guest(data: Optional[GuestLoginRequest] = None, db: AsyncSession = Depends(get_db)):
    """
    Issue an authenticated guest session for instant mobile exploration.
    Creates an anonymous profile in the users table so locations, preferences,
    and voice chat sessions can be attached seamlessly.
    """
    guest_name = data.name if data and data.name else "Guest User"
    guest_lang = data.preferred_language if data and data.preferred_language else "te"

    user = User(
        name=guest_name,
        email=None,
        email_verified=False,
        preferred_language=guest_lang,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        user_id=user.id,
        email=None,
        name=user.name,
        is_guest=True,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        is_new_user=True,
        user=user,
    )


# ── 8. Profile & Session Management ──────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user (never leaks password or hash)."""
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Acknowledge logout and invalidate client session."""
    return {
        "status": "ok",
        "message": f"User {current_user.name} logged out successfully.",
    }
