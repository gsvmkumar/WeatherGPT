"""
Chat router — AI weather chatbot endpoint with PostgreSQL chat history persistence.
Implements the full conversational flow:
User message → Intent & Location extraction → Open-Meteo verified weather → Gemini grounded response → DB history
"""

import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import ChatHistory, ChatSession
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryMessage, WeatherSnapshot
from app.services import geocoding_service, weather_service, llm_service
from app.utils import cache

router = APIRouter(prefix="/api/chat", tags=["chat"])


def to_session_uuid(sid: str) -> uuid.UUID:
    """Safely convert any session string into a PostgreSQL-compatible UUID."""
    try:
        return uuid.UUID(sid)
    except (ValueError, TypeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, sid)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Process a natural-language weather question and return an AI-generated response
    strictly grounded in verified Open-Meteo weather data.
    """
    cleaned_message = request.message.strip()
    if not cleaned_message:
        raise HTTPException(status_code=400, detail="Question message cannot be empty")

    session_uuid = to_session_uuid(request.session_id)

    # ── Step 1: Retrieve recent chat history for context (up to 6 messages) ──
    history_context: list[dict] = []
    try:
        query = (
            select(ChatHistory)
            .where(ChatHistory.session_id == session_uuid)
            .order_by(ChatHistory.created_at.desc())
            .limit(6)
        )
        res = await db.execute(query)
        recent_records = list(reversed(res.scalars().all()))
        history_context = [
            {"role": r.role, "content": r.content}
            for r in recent_records
        ]
    except Exception as e:
        print(f"[Chat History Warning] Could not load prior messages: {e}")

    # ── Step 2: Extract intent and location from the message ─────────────────
    intent_data = await llm_service.extract_intent_and_location(
        message=cleaned_message,
        default_location=request.location,
    )

    resolved_location = intent_data.get("location") or request.location
    lat, lon = request.lat, request.lon
    location_name = resolved_location

    location_not_found = False
    if resolved_location and (lat is None or lon is None):
        cached_geo = cache.get_geocode_cache(resolved_location)
        if cached_geo:
            lat = cached_geo["latitude"]
            lon = cached_geo["longitude"]
            location_name = cached_geo["name"]
        else:
            geo = await geocoding_service.geocode_location(resolved_location)
            if geo:
                lat = geo["latitude"]
                lon = geo["longitude"]
                location_name = geo["name"]
                cache.set_geocode_cache(resolved_location, geo)
            else:
                location_not_found = True

    # ── Step 3: Fetch verified weather data from Open-Meteo ──────────────────
    weather_context: dict = {}
    weather_data_used = False
    weather_snapshot: WeatherSnapshot | None = None

    if location_not_found:
        if request.language == "te":
            ai_response = (
                f"క్షమించండి, '{resolved_location}' ప్రాంతం వివరాలు లభించలేదు. "
                "దయచేసి పేరు సరిచూసుకోండి లేదా సమీప జిల్లా/నగరం పేరును పేర్కొనండి."
            )
        else:
            ai_response = (
                f"I couldn't find the location '{resolved_location}'. "
                "Please check the spelling or mention a nearby district or major city."
            )
    elif lat is not None and lon is not None:
        try:
            needs_forecast = intent_data.get("needs_forecast", False)
            intent = intent_data.get("intent", "current")

            # Always fetch current weather for context
            current = cache.get_current_weather_cache(lat, lon)
            if not current:
                current = await weather_service.fetch_current_weather(lat, lon, location_name)
                cache.set_current_weather_cache(lat, lon, current)

            cur_dict = current.model_dump() if hasattr(current, "model_dump") else current
            weather_context["current"] = cur_dict
            weather_data_used = True

            # Construct structured snapshot for chat UI display
            weather_snapshot = WeatherSnapshot(
                location=cur_dict.get("location", location_name or "Unknown"),
                temperature_c=float(cur_dict.get("temperature_c", 0.0)),
                feels_like_c=float(cur_dict.get("feels_like_c", cur_dict.get("temperature_c", 0.0))),
                humidity_pct=int(cur_dict.get("humidity_pct", 0)),
                wind_speed_kmh=float(cur_dict.get("wind_speed_kmh", 0.0)),
                rain_probability_pct=int(cur_dict.get("rain_probability_pct", 0)),
                condition_text=str(cur_dict.get("condition_text", "Current conditions")),
                condition_code=int(cur_dict.get("condition_code", 0)),
                is_day=bool(cur_dict.get("is_day", True)),
            )

            # Fetch forecast if needed
            if needs_forecast or intent in {"forecast", "alert", "advisory"}:
                forecast = cache.get_forecast_cache(lat, lon, 7)
                if not forecast:
                    forecast = await weather_service.fetch_forecast(lat, lon, location_name, 7)
                    cache.set_forecast_cache(lat, lon, 7, forecast)
                weather_context["forecast"] = (
                    forecast.model_dump() if hasattr(forecast, "model_dump") else forecast
                )

        except Exception as e:
            # Inform LLM of fetch failure rather than crashing
            weather_context["error"] = f"Could not fetch weather data from weather service: {str(e)}"

        # ── Step 4: Generate LLM response grounded in real data ───────────────
        ai_response = await llm_service.generate_weather_response(
            user_message=cleaned_message,
            weather_context=weather_context,
            language=request.language,
            chat_history=history_context,
        )
    else:
        # General meteorological question with no specific location
        ai_response = await llm_service.generate_weather_response(
            user_message=cleaned_message,
            weather_context={},
            language=request.language,
            chat_history=history_context,
        )

    # ── Step 5: Persist user & assistant messages to PostgreSQL ──────────────
    try:
        # Ensure session exists in chat_sessions so foreign key is satisfied
        sess = await db.get(ChatSession, session_uuid)
        if not sess:
            sess = ChatSession(id=session_uuid, title=f"Weather Chat ({location_name or 'General'})")
            db.add(sess)
            await db.flush()

        user_entry = ChatHistory(
            session_id=session_uuid,
            role="user",
            content=cleaned_message,
            language=request.language,
        )
        assistant_entry = ChatHistory(
            session_id=session_uuid,
            role="assistant",
            content=ai_response,
            language=request.language,
            weather_context=weather_snapshot.model_dump() if weather_snapshot else None,
        )
        db.add(user_entry)
        db.add(assistant_entry)
        await db.commit()
    except Exception as e:
        print(f"[Chat History Warning] Could not save messages: {e}")
        await db.rollback()

    return ChatResponse(
        session_id=request.session_id,
        message=ai_response,
        language=request.language,
        weather_data_used=weather_data_used,
        location_resolved=location_name,
        weather_data=weather_snapshot,
    )


@router.get("/history/{session_id}", response_model=list[ChatHistoryMessage])
async def get_chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full chat history for a session from PostgreSQL."""
    session_uuid = to_session_uuid(session_id)
    query = (
        select(ChatHistory)
        .where(ChatHistory.session_id == session_uuid)
        .order_by(ChatHistory.created_at.asc())
    )
    res = await db.execute(query)
    records = res.scalars().all()

    messages: list[ChatHistoryMessage] = []
    for r in records:
        snapshot = None
        if r.weather_context and isinstance(r.weather_context, dict):
            if "temperature_c" in r.weather_context:
                try:
                    snapshot = WeatherSnapshot(**r.weather_context)
                except Exception:
                    pass

        messages.append(
            ChatHistoryMessage(
                id=str(r.id),
                role=r.role,
                content=r.content,
                language=r.language,
                created_at=r.created_at.isoformat(),
                weather_data=snapshot,
            )
        )
    return messages


@router.delete("/history/{session_id}")
async def clear_chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Clear chat history for a session."""
    session_uuid = to_session_uuid(session_id)
    await db.execute(delete(ChatHistory).where(ChatHistory.session_id == session_uuid))
    await db.commit()
    return {"status": "ok", "message": "Chat history cleared"}
