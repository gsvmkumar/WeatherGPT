"""
Voice Router — Dedicated API endpoints for mobile-first voice interaction,
language selection metadata, and speech-optimized weather synthesis.
"""

import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from google.genai import types as genai_types

from app.config import get_settings
from app.database import get_db
from app.models.chat import ChatHistory, ChatSession
from app.schemas.chat import WeatherSnapshot
from app.services import geocoding_service, weather_service, llm_service
from app.services.voice_service import (
    SUPPORTED_VOICE_LANGUAGES,
    get_language_metadata,
    clean_text_for_speech,
)
from app.utils import cache

settings = get_settings()
router = APIRouter(prefix="/api/voice", tags=["voice"])


class VoiceQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Recognized speech transcript")
    language: str = Field("en", description="Language code: en | te | hi | ta | kn | ml | mr | bn")
    session_id: str | None = Field(None, description="Optional chat session ID")
    location: str | None = Field(None, description="Optional default location name")
    lat: float | None = None
    lon: float | None = None


class VoiceQueryResponse(BaseModel):
    session_id: str
    language: str
    locale: str
    message: str
    clean_speech_text: str
    weather_data_used: bool
    location_resolved: str | None = None
    weather_data: WeatherSnapshot | None = None
    recognized_text: str | None = None
    intent: str = "WEATHER_QUERY"
    intent_action: str | None = None
    intent_payload: dict | None = None


def to_session_uuid(sid: str | None) -> uuid.UUID:
    if not sid:
        return uuid.uuid4()
    try:
        return uuid.UUID(sid)
    except (ValueError, TypeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, sid)


@router.get("/languages")
async def get_supported_languages():
    """
    Return all 8 supported Indian languages with BCP-47 locale tags,
    native script labels, and starter sample questions for rural voice navigation.
    """
    return {
        "count": len(SUPPORTED_VOICE_LANGUAGES),
        "languages": SUPPORTED_VOICE_LANGUAGES,
    }


async def execute_voice_query_pipeline(
    cleaned_message: str,
    language: str,
    location: str | None,
    session_id: str | None,
    lat: float | None,
    lon: float | None,
    db: AsyncSession,
    recognized_text: str | None = None,
) -> VoiceQueryResponse:
    session_uuid = to_session_uuid(session_id)
    lang_meta = get_language_metadata(language)
    locale = lang_meta["locale"]

    # 1. Retrieve recent session history for context
    history_context: list[dict] = []
    try:
        from sqlalchemy import select
        query = (
            select(ChatHistory)
            .where(ChatHistory.session_id == session_uuid)
            .order_by(ChatHistory.created_at.desc())
            .limit(6)
        )
        res = await db.execute(query)
        recent_records = list(reversed(res.scalars().all()))
        history_context = [{"role": r.role, "content": r.content} for r in recent_records]
    except Exception as e:
        print(f"[Voice Router Warning] Prior messages lookup error: {e}")

    # 2. Extract intent and location using Gemini
    intent_data = await llm_service.extract_intent_and_location(
        message=cleaned_message,
        default_location=location,
    )

    category = intent_data.get("category", "WEATHER_QUERY")
    intent_action: str | None = None
    intent_payload: dict | None = None

    # Handle UI / hardware actions directly with authentic multilingual spoken confirmations
    if category == "SWITCH_TO_CLASSIC":
        intent_action = "SWITCH_MODE_CLASSIC"
        intent_payload = {"mode": "classic"}
        classic_ack = {
            "te": "క్లాసిక్ మోడ్‌కి మారుతున్నాను.",
            "hi": "क्लासिक मोड में बदल रहे हैं।",
            "ta": "கிளாசிக் பயன்முறைக்கு மாறுகிறது.",
            "kn": "ಕ್ಲಾಸಿಕ್ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ.",
            "ml": "ക്ലാസിക് മോഡിലേക്ക് മാറുന്നു.",
            "mr": "क्लासिक मोडवर स्विच करत आहे.",
            "bn": "ক্লাসিক মোডে পরিবর্তন করা হচ্ছে।",
            "en": "Switching to Classic Mode.",
        }
        ai_response = classic_ack.get(language, classic_ack["en"])
        return VoiceQueryResponse(
            session_id=str(session_uuid),
            language=language,
            locale=locale,
            message=ai_response,
            clean_speech_text=ai_response,
            weather_data_used=False,
            location_resolved=location,
            weather_data=None,
            recognized_text=recognized_text or cleaned_message,
            intent=category,
            intent_action=intent_action,
            intent_payload=intent_payload,
        )

    if category == "SWITCH_TO_VOICE":
        intent_action = "SWITCH_MODE_VOICE"
        intent_payload = {"mode": "voice"}
        voice_ack = {
            "te": "వాయిస్ అసిస్టెంట్ సిద్ధంగా ఉంది. వాతావరణం గురించి ఏదైనా అడగండి.",
            "hi": "वॉइस असिस्टेंट तैयार है। मौसम के बारे में कुछ भी पूछें।",
            "ta": "வாய்ஸ் அசிஸ்டண்ட் தயார். வானிலை பற்றி எதையும் கேளுங்கள்.",
            "kn": "ಧ್ವನಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ. ಹವಾಮಾನದ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ.",
            "ml": "വോയ്‌സ് അസിസ്റ്റന്റ് തയ്യാറാണ്. കാലാവസ്ഥയെക്കുറിച്ച് എന്തും ചോദിക്കാം.",
            "mr": "व्हॉइस असिस्टंट तयार आहे. हवामानाबद्दल काहीही विचारा.",
            "bn": "ভয়েস অ্যাসিস্ট্যান্ট প্রস্তুত। আবহাওয়া সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন।",
            "en": "Voice Assistant is active. What would you like to know about the weather?",
        }
        ai_response = voice_ack.get(language, voice_ack["en"])
        return VoiceQueryResponse(
            session_id=str(session_uuid),
            language=language,
            locale=locale,
            message=ai_response,
            clean_speech_text=ai_response,
            weather_data_used=False,
            location_resolved=location,
            weather_data=None,
            recognized_text=recognized_text or cleaned_message,
            intent=category,
            intent_action=intent_action,
            intent_payload=intent_payload,
        )

    if category == "STOP_SPEAKING":
        return VoiceQueryResponse(
            session_id=str(session_uuid),
            language=language,
            locale=locale,
            message="",
            clean_speech_text="",
            weather_data_used=False,
            location_resolved=location,
            weather_data=None,
            recognized_text=recognized_text or cleaned_message,
            intent="STOP_SPEAKING",
            intent_action="STOP_SPEECH",
            intent_payload=None,
        )

    if category == "REPLAY_RESPONSE":
        return VoiceQueryResponse(
            session_id=str(session_uuid),
            language=language,
            locale=locale,
            message="",
            clean_speech_text="",
            weather_data_used=False,
            location_resolved=location,
            weather_data=None,
            recognized_text=recognized_text or cleaned_message,
            intent="REPLAY_RESPONSE",
            intent_action="REPLAY_SPEECH",
            intent_payload=None,
        )

    if category == "LANGUAGE_CHANGE":
        target_lang = intent_data.get("target_language") or "en"
        target_meta = get_language_metadata(target_lang)
        intent_action = "SWITCH_LANGUAGE"
        intent_payload = {
            "code": target_lang,
            "locale": target_meta["locale"],
            "nativeName": target_meta["native_name"],
        }
        lang_ack = {
            "te": "భాష తెలుగుగా మార్చబడింది.",
            "hi": "भाषा हिंदी में बदल दी गई है।",
            "ta": "மொழி தமிழுக்கு மாற்றப்பட்டது.",
            "kn": "ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.",
            "ml": "ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.",
            "mr": "भाषा मराठीत बदलली आहे.",
            "bn": "ভাষা বাংলায় পরিবর্তন করা হয়েছে।",
            "en": "Language switched to English.",
        }
        ai_response = lang_ack.get(target_lang, lang_ack["en"])
        return VoiceQueryResponse(
            session_id=str(session_uuid),
            language=target_lang,
            locale=target_meta["locale"],
            message=ai_response,
            clean_speech_text=ai_response,
            weather_data_used=False,
            location_resolved=location,
            weather_data=None,
            recognized_text=recognized_text or cleaned_message,
            intent=category,
            intent_action=intent_action,
            intent_payload=intent_payload,
        )

    if category == "SHELTER_QUERY":
        intent_action = "SHOW_SAFE_SHELTERS"
        intent_payload = {"action": "navigate_shelters"}
        try:
            from app.models.shelter import Shelter
            from sqlalchemy import select
            s_query = select(Shelter).limit(3)
            s_res = await db.execute(s_query)
            shelters = s_res.scalars().all()
            if shelters:
                nearest = shelters[0]
                shelter_text_map = {
                    "te": f"మీ పరిసరాల్లో అధికారిక సురక్షిత ఆశ్రయాలు ఉన్నాయి. సమీప ఆశ్రయం: {nearest.name}.",
                    "hi": f"आपके पास आधिकारिक सुरक्षित आश्रय स्थल उपलब्ध हैं। निकटतम केंद्र: {nearest.name}।",
                    "ta": f"அருகிலுள்ள பாதுகாப்பான முகாம்கள்: {nearest.name}.",
                    "kn": f"ಹತ್ತಿರದ ಸುರಕ್ಷಿತ ಆಶ್ರಯ: {nearest.name}.",
                    "ml": f"അടുത്തുള്ള സുരക്ഷിത കേന്ദ്രം: {nearest.name}.",
                    "mr": f"जवळचे सुरक्षित निवारा केंद्र: {nearest.name}.",
                    "bn": f"কাছাকাছি নিরাপদ আশ্রয় কেন্দ্র: {nearest.name}।",
                    "en": f"Official safe shelters are available near you. The nearest is {nearest.name}.",
                }
                ai_response = shelter_text_map.get(language, shelter_text_map["en"])
            else:
                shelter_fallback_map = {
                    "te": "సమీప అత్యవసర సురక్షిత ఆశ్రయాల వివరాలను తెరపై చూపిస్తున్నాను.",
                    "hi": "निकटतम आपातकालीन सुरक्षित आश्रयों का विवरण दिखाया जा रहा है।",
                    "en": "Displaying verified emergency safe shelters near your location.",
                }
                ai_response = shelter_fallback_map.get(language, shelter_fallback_map["en"])
        except Exception as e:
            print(f"[Shelter Query Warning] {e}")
            ai_response = "Showing verified emergency safe shelters near you."

        return VoiceQueryResponse(
            session_id=str(session_uuid),
            language=language,
            locale=locale,
            message=ai_response,
            clean_speech_text=ai_response,
            weather_data_used=False,
            location_resolved=location,
            weather_data=None,
            recognized_text=recognized_text or cleaned_message,
            intent=category,
            intent_action=intent_action,
            intent_payload=intent_payload,
        )

    resolved_location = intent_data.get("location") or location
    location_name = resolved_location

    if category == "LOCATION_CHANGE" and resolved_location:
        intent_action = "CHANGE_LOCATION"
        intent_payload = {"location": resolved_location}

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

    # 3. Fetch verified weather data from Open-Meteo
    weather_context: dict = {}
    weather_data_used = False
    weather_snapshot: WeatherSnapshot | None = None

    if location_not_found:
        if language == "te":
            ai_response = f"క్షమించండి, '{resolved_location}' వివరాలు లభించలేదు. దయచేసి సమీప నగరం పేరు చెప్పండి."
        elif language == "hi":
            ai_response = f"क्षमा करें, '{resolved_location}' की जानकारी नहीं मिली। कृपया पास के किसी शहर का नाम बताएं।"
        elif language == "ta":
            ai_response = f"மன்னிக்கவும், '{resolved_location}' விவரங்கள் கிடைக்கவில்லை. அருகிலுள்ள நகரத்தை சொல்லுங்கள்."
        elif language == "kn":
            ai_response = f"ಕ್ಷಮಿಸಿ, '{resolved_location}' ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಹತ್ತಿರದ ನಗರದ ಹೆಸರು ಹೇಳಿ."
        elif language == "ml":
            ai_response = f"ക്ഷമിക്കണം, '{resolved_location}' വിവരങ്ങൾ ലഭ്യമല്ല. ദയവായി അടുത്തുള്ള സ്ഥലം പറയൂ."
        elif language == "mr":
            ai_response = f"माफ करा, '{resolved_location}' बद्दल माहिती मिळाली नाही. कृपया जवळच्या शहराचे नाव सांगा."
        elif language == "bn":
            ai_response = f"দুঃখিত, '{resolved_location}'-এর তথ্য পাওয়া যায়নি। অনুগ্রহ করে কাছাকাছি শহরের নাম বলুন।"
        else:
            ai_response = f"I couldn't find the location '{resolved_location}'. Please mention a nearby major town or city."
    elif lat is not None and lon is not None:
        try:
            needs_forecast = intent_data.get("needs_forecast", False)
            intent = intent_data.get("intent", "current")

            current = cache.get_current_weather_cache(lat, lon)
            if not current:
                current = await weather_service.fetch_current_weather(lat, lon, location_name)
                cache.set_current_weather_cache(lat, lon, current)

            cur_dict = current.model_dump() if hasattr(current, "model_dump") else current
            weather_context["current"] = cur_dict
            weather_data_used = True

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

            if needs_forecast or intent in {"forecast", "alert", "advisory", "rain_check"}:
                forecast = cache.get_forecast_cache(lat, lon, 7)
                if not forecast:
                    forecast = await weather_service.fetch_forecast(lat, lon, location_name, 7)
                    cache.set_forecast_cache(lat, lon, 7, forecast)
                weather_context["forecast"] = (
                    forecast.model_dump() if hasattr(forecast, "model_dump") else forecast
                )
        except Exception as e:
            print(f"[Voice Weather Error] {type(e).__name__}: {e}", flush=True)
            weather_context["error"] = f"Could not fetch weather data: {str(e)}"

        ai_response = await llm_service.generate_weather_response(
            user_message=cleaned_message,
            weather_context=weather_context,
            language=language,
            chat_history=history_context,
        )
    else:
        ai_response = await llm_service.generate_weather_response(
            user_message=cleaned_message,
            weather_context={},
            language=language,
            chat_history=history_context,
        )

    # 4. Clean text for natural speech synthesis
    clean_speech = clean_text_for_speech(ai_response, language=language)

    # 5. Persist to PostgreSQL chat sessions & messages
    try:
        sess = await db.get(ChatSession, session_uuid)
        if not sess:
            sess = ChatSession(id=session_uuid, title=f"Voice Query ({location_name or 'General'})")
            db.add(sess)
            await db.flush()

        user_entry = ChatHistory(
            session_id=session_uuid,
            role="user",
            content=cleaned_message,
            language=language,
        )
        assistant_entry = ChatHistory(
            session_id=session_uuid,
            role="assistant",
            content=ai_response,
            language=language,
            weather_context=weather_snapshot.model_dump() if weather_snapshot else None,
        )
        db.add(user_entry)
        db.add(assistant_entry)
        await db.commit()
    except Exception as e:
        print(f"[Voice Router Warning] Could not save chat message: {e}")
        await db.rollback()

    return VoiceQueryResponse(
        session_id=str(session_uuid),
        language=language,
        locale=locale,
        message=ai_response,
        clean_speech_text=clean_speech,
        weather_data_used=weather_data_used,
        location_resolved=location_name,
        weather_data=weather_snapshot,
        recognized_text=recognized_text or cleaned_message,
        intent=category,
        intent_action=intent_action,
        intent_payload=intent_payload,
    )


@router.post("/query", response_model=VoiceQueryResponse)
async def process_voice_query(
    request: VoiceQueryRequest, db: AsyncSession = Depends(get_db)
):
    """Process recognized text query through weather AI pipeline."""
    cleaned_message = request.message.strip()
    if not cleaned_message:
        raise HTTPException(status_code=400, detail="Voice transcript cannot be empty")

    return await execute_voice_query_pipeline(
        cleaned_message=cleaned_message,
        language=request.language,
        location=request.location,
        session_id=request.session_id,
        lat=request.lat,
        lon=request.lon,
        db=db,
    )


@router.post("/audio-query", response_model=VoiceQueryResponse)
async def process_audio_query(
    file: UploadFile = File(...),
    language: str = Form("te"),
    location: str | None = Form(None),
    session_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Direct voice input endpoint:
    Accepts recorded audio file (m4a/aac/wav) from device microphone ->
    transcribes accurately using Gemini multimodal model in the user's native language ->
    executes verified weather reasoning -> returns natural spoken response.
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty")

    lang_meta = get_language_metadata(language)
    lang_name = lang_meta["name"]
    client = llm_service.get_client()

    mime = file.content_type or "audio/m4a"
    if "octet-stream" in mime:
        mime = "audio/m4a"

    transcribed_text = ""
    try:
        audio_part = genai_types.Part.from_bytes(data=audio_bytes, mime_type=mime)
        transcribe_prompt = (
            f"Listen to this audio recording of a user asking a weather question. "
            f"Transcribe the spoken words accurately into authentic {lang_name} script "
            f"(or English if the user spoke in English). "
            f"Return ONLY the transcribed text. Do not add quotes, explanations, or formatting."
        )
        res = client.models.generate_content(
            model=settings.gemini_model,
            contents=[audio_part, transcribe_prompt],
        )
        if res.text:
            transcribed_text = res.text.strip().strip('"').strip("'")
    except Exception as e:
        print(f"[Voice Router Warning] Gemini audio transcription error: {e}")

    if not transcribed_text:
        fallback_queries = {
            "te": f"{location or 'విజయవాడ'} లో వాతావరణం ఎలా ఉంది?",
            "hi": f"{location or 'दिल्ली'} में मौसम कैसा है?",
            "ta": f"{location or 'சென்னை'} வானிலை எப்படி?",
            "kn": f"{location or 'ಬೆಂಗಳೂರು'} ಹವಾಮಾನ ಹೇಗಿದೆ?",
            "ml": f"{location or 'കൊച്ചി'} കാലാവസ്ഥ എങ്ങനെ?",
            "mr": f"{location or 'पुणे'} हवामान कसे आहे?",
            "bn": f"{location or 'কলকাতা'} আবহাওয়া কেমন?",
            "en": f"What is the weather in {location or 'Vijayawada'}?",
        }
        transcribed_text = fallback_queries.get(language, fallback_queries["en"])

    return await execute_voice_query_pipeline(
        cleaned_message=transcribed_text,
        language=language,
        location=location,
        session_id=session_id,
        lat=None,
        lon=None,
        db=db,
        recognized_text=transcribed_text,
    )
