"""Pydantic schemas for User, Location, ChatSession, AlertPreference, and DeviceToken."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict, computed_field


# ── User Schemas ─────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    preferred_language: str = Field("en", max_length=10)


class UserUpdateLanguage(BaseModel):
    preferred_language: str = Field(..., min_length=2, max_length=10)


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str | None
    phone: str | None
    preferred_language: str
    email_verified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password (min 6 characters)")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="Confirmation password")
    preferred_language: str = Field("te", max_length=10, description="Default preferred language")


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")


class EmailVerifyRequest(BaseModel):
    token: str = Field(..., min_length=1, description="Verification token")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1, description="Password reset token")
    new_password: str = Field(..., min_length=6, max_length=128, description="New account password")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="Confirm new password")


# ── User Saved Locations ─────────────────────────────────────────────────────
class UserLocationCreate(BaseModel):
    location_name: str = Field(..., min_length=1, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    is_default: bool = False


class UserLocationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    location_name: str
    latitude: float
    longitude: float
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Chat Sessions & Messages ─────────────────────────────────────────────────
class ChatSessionCreate(BaseModel):
    title: str | None = Field(None, max_length=255)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(BaseModel):
    role: str = Field(..., max_length=20)  # user | assistant | system
    content: str = Field(..., min_length=1)
    language: str = Field("en", max_length=10)
    weather_context: dict | None = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    language: str
    weather_context: dict | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Alert Preferences ────────────────────────────────────────────────────────
class AlertPreferenceCreate(BaseModel):
    location_id: uuid.UUID | None = None
    alert_type: str = Field(..., min_length=1, max_length=50)  # rain | temp_high | wind | humidity
    threshold: float | None = None
    enabled: bool = True


class AlertPreferenceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    location_id: uuid.UUID | None
    alert_type: str
    threshold: float | None
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Device Tokens ────────────────────────────────────────────────────────────
class DeviceTokenCreate(BaseModel):
    push_token: str = Field(..., min_length=10, max_length=512)
    platform: str = Field(..., max_length=20)  # android | ios | web
 
 
class DeviceTokenResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    push_token: str
    platform: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def push_token_masked(self) -> str:
        """Return masked token string to protect sensitive device push token."""
        if not self.push_token or len(self.push_token) <= 8:
            return "***"
        return f"{self.push_token[:4]}...{self.push_token[-4:]}"
