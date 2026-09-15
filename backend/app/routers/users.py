"""
Users router — foundation CRUD endpoints for users, saved locations,
chat sessions/messages, alert preferences, and mobile device tokens.
Protected with verify_user_access to enforce IDOR security.
"""

import uuid
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserLocation, DeviceToken
from app.models.chat import ChatSession, ChatMessage
from app.models.alert import AlertPreference
from app.services.auth import verify_user_access
from app.schemas.user import (
    UserCreate,
    UserUpdateLanguage,
    UserResponse,
    UserLocationCreate,
    UserLocationResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    AlertPreferenceCreate,
    AlertPreferenceResponse,
    DeviceTokenCreate,
    DeviceTokenResponse,
)

router = APIRouter(prefix="/api/users", tags=["users"])


# ── User Profile ─────────────────────────────────────────────────────────────
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user profile with preferred language and optional contact info."""
    if data.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"User with email '{data.email}' already exists")

    if data.phone:
        existing_phone = await db.execute(select(User).where(User.phone == data.phone))
        if existing_phone.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"User with phone '{data.phone}' already exists")

    user = User(
        name=data.name,
        email=data.email,
        phone=data.phone,
        preferred_language=data.preferred_language,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve user profile by UUID (Protected — requires ownership)."""
    return current_user


@router.put("/{user_id}/language", response_model=UserResponse)
async def update_preferred_language(
    user_id: uuid.UUID,
    data: UserUpdateLanguage,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Update user preferred language (e.g., 'en', 'te') (Protected)."""
    current_user.preferred_language = data.preferred_language
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ── User Saved Locations ─────────────────────────────────────────────────────
@router.post("/{user_id}/locations", response_model=UserLocationResponse, status_code=status.HTTP_201_CREATED)
async def save_user_location(
    user_id: uuid.UUID,
    data: UserLocationCreate,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Save a user favorite/home/work location (Protected)."""
    # If new location is set as default, clear previous defaults
    if data.is_default:
        await db.execute(
            update(UserLocation)
            .where(UserLocation.user_id == user_id)
            .values(is_default=False)
        )

    user_loc = UserLocation(
        user_id=user_id,
        location_name=data.location_name,
        latitude=data.latitude,
        longitude=data.longitude,
        is_default=data.is_default,
    )
    db.add(user_loc)
    await db.commit()
    await db.refresh(user_loc)
    return user_loc


@router.get("/{user_id}/locations", response_model=list[UserLocationResponse])
async def get_user_locations(
    user_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """List all saved locations for a user (Protected)."""
    res = await db.execute(
        select(UserLocation)
        .where(UserLocation.user_id == user_id)
        .order_by(UserLocation.is_default.desc(), UserLocation.created_at.desc())
    )
    return res.scalars().all()


@router.delete("/{user_id}/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_location(
    user_id: uuid.UUID,
    location_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user saved location by ID (Protected)."""
    loc = await db.get(UserLocation, location_id)
    if not loc or loc.user_id != user_id:
        raise HTTPException(status_code=404, detail="Location not found")
    await db.delete(loc)
    await db.commit()
    return None


# ── Chat Sessions & Messages ─────────────────────────────────────────────────
@router.post("/{user_id}/chat/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    user_id: uuid.UUID,
    data: ChatSessionCreate,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat conversation session for a user (Protected)."""
    session = ChatSession(
        user_id=user_id,
        title=data.title or "Weather Conversation",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{user_id}/chat/sessions", response_model=list[ChatSessionResponse])
async def get_user_chat_sessions(
    user_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all chat conversation sessions for a user (Protected)."""
    res = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
    )
    return res.scalars().all()


@router.post(
    "/{user_id}/chat/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_chat_message(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    data: ChatMessageCreate,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Save a chat message to a specific conversation session (Protected)."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Chat session not found for this user")

    msg = ChatMessage(
        session_id=session_id,
        role=data.role,
        content=data.content,
        language=data.language,
        weather_context=data.weather_context,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


@router.get(
    "/{user_id}/chat/sessions/{session_id}/messages",
    response_model=list[ChatMessageResponse],
)
async def get_session_messages(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all chat messages in a conversation session (Protected)."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Chat session not found for this user")

    res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return res.scalars().all()


# ── Alert Preferences ────────────────────────────────────────────────────────
@router.post("/{user_id}/alert-preferences", response_model=AlertPreferenceResponse)
async def create_or_update_alert_preference(
    user_id: uuid.UUID,
    data: AlertPreferenceCreate,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Configure or update weather alert threshold and toggle for user/location (Protected)."""
    if data.location_id:
        loc = await db.get(UserLocation, data.location_id)
        if not loc or loc.user_id != user_id:
            raise HTTPException(status_code=404, detail="Saved location not found for this user")

    # Upsert logic
    query = select(AlertPreference).where(
        and_(
            AlertPreference.user_id == user_id,
            AlertPreference.location_id == data.location_id,
            AlertPreference.alert_type == data.alert_type,
        )
    )
    res = await db.execute(query)
    existing = res.scalar_one_or_none()

    if existing:
        existing.threshold = data.threshold
        existing.enabled = data.enabled
        pref = existing
    else:
        pref = AlertPreference(
            user_id=user_id,
            location_id=data.location_id,
            alert_type=data.alert_type,
            threshold=data.threshold,
            enabled=data.enabled,
        )
        db.add(pref)

    await db.commit()
    await db.refresh(pref)
    return pref


@router.get("/{user_id}/alert-preferences", response_model=list[AlertPreferenceResponse])
async def get_user_alert_preferences(
    user_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all alert preferences for a user (Protected)."""
    res = await db.execute(
        select(AlertPreference)
        .where(AlertPreference.user_id == user_id)
        .order_by(AlertPreference.alert_type.asc())
    )
    return res.scalars().all()


# ── Device Tokens ────────────────────────────────────────────────────────────
@router.post("/{user_id}/device-tokens", response_model=DeviceTokenResponse)
async def register_device_token(
    user_id: uuid.UUID,
    data: DeviceTokenCreate,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """Register or update mobile push notification device token (Protected)."""
    # Check if push_token already registered
    res = await db.execute(select(DeviceToken).where(DeviceToken.push_token == data.push_token))
    existing = res.scalar_one_or_none()

    if existing:
        existing.user_id = user_id
        existing.platform = data.platform
        token_obj = existing
    else:
        token_obj = DeviceToken(
            user_id=user_id,
            push_token=data.push_token,
            platform=data.platform,
        )
        db.add(token_obj)

    await db.commit()
    await db.refresh(token_obj)
    return token_obj


@router.get("/{user_id}/device-tokens", response_model=list[DeviceTokenResponse])
async def get_user_device_tokens(
    user_id: uuid.UUID,
    current_user: User = Depends(verify_user_access),
    db: AsyncSession = Depends(get_db),
):
    """List registered device push tokens for a user (Protected)."""
    res = await db.execute(
        select(DeviceToken)
        .where(DeviceToken.user_id == user_id)
        .order_by(DeviceToken.created_at.desc())
    )
    return res.scalars().all()
