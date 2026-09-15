"""
WeatherGPT — LLM Service (Google Gemini via google-genai SDK)
Handles all AI interactions. The LLM NEVER generates weather data —
it only receives verified weather facts and produces natural-language responses.
"""

import json
import re
from google import genai
from google.genai import types as genai_types
from app.config import get_settings

settings = get_settings()

_client: genai.Client | None = None


def get_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


LANGUAGE_NAMES = {
    "en": "English",
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
}

LANGUAGE_SCRIPTS = {
    "en": "Latin script",
    "te": "Telugu script (తెలుగు లిపి)",
    "hi": "Devanagari script (हिन्दी)",
    "ta": "Tamil script (தமிழ்)",
    "kn": "Kannada script (ಕನ್ನಡ)",
    "ml": "Malayalam script (മലയാളം)",
    "mr": "Marathi script (मराठी)",
    "bn": "Bengali script (বাংলা)",
}

SYSTEM_PROMPT = """You are WeatherGPT, a helpful AI weather assistant for India.

CRITICAL RULES:
1. You MUST only use the weather data provided in the user's context. Never invent or guess weather values.
2. If no weather data is provided for a question, say you couldn't fetch the data and ask the user to try again.
3. Always respond in the language specified using that language's authentic native script.
4. Be conversational, friendly, and concise. Avoid jargon.
5. When giving advice, base it only on the weather data given to you.
6. Do not hallucinate future weather unless forecast data is explicitly provided.
"""


async def extract_intent_and_location(message: str, default_location: str | None = None) -> dict:
    """
    Use Gemini to extract structured intent, location, action, and date from the user message.
    Understands dynamic, natural language queries across 8 Indian languages and English.
    Returns a JSON dict with category, intent, location, target_language, date_context, etc.
    """
    prompt = f"""You are the Natural Language Intent Understanding Engine for WeatherGPT.
Analyze the user's spoken or typed message and extract structured intent. Return ONLY valid JSON, no markdown.

Question / Statement: "{message}"
Default location if none mentioned: "{default_location or 'not specified'}"

Return this exact JSON structure:
{{
  "category": "WEATHER_QUERY|HOURLY_FORECAST|WEEKLY_FORECAST|LOCATION_CHANGE|ALERT_QUERY|SHELTER_QUERY|ADVISORY_QUERY|SWITCH_TO_VOICE|SWITCH_TO_CLASSIC|REPLAY_RESPONSE|STOP_SPEAKING|HELP|LANGUAGE_CHANGE|GENERAL_WEATHER_CONVERSATION",
  "intent": "current|forecast|history|alert|advisory|general|action",
  "location": "city/town name in English or null",
  "target_language": "en|te|hi|ta|kn|ml|mr|bn or null",
  "date_context": "today|tomorrow|day_after|next_week|specific_date|past|null",
  "specific_date": "YYYY-MM-DD or null",
  "needs_current": true,
  "needs_forecast": false,
  "needs_history": false
}}

Classification Guidelines:
1. SWITCH_TO_VOICE: User wants to continue with voice mode, voice assistant, voice talking, or speak verbally.
   Examples: "Yes, continue with voice", "Can you continue talking to me?", "Let's use voice", "I want voice mode", "Talk to me", "Voice assistant", "నాతో వాయిస్ లో మాట్లాడు", "వాయిస్ మోడ్", "मुझसे बात करो", "वॉइस असिस्टेंट", "வாய்ஸ் அசிஸ்டன்ட்", "ಧ್ವನಿ ಮೋಡ್".
   -> category="SWITCH_TO_VOICE", intent="action"

2. SWITCH_TO_CLASSIC: User wants to switch to classic mode, see normal screen/cards, exit voice, switch to text.
   Examples: "Show me the normal screen", "I don't want voice", "Let me see the weather", "Switch to text mode", "Open classic mode", "Classic mode", "క్లాసిక్ మోడ్", "స్క్రీన్ చూపించు", "క్లాసిక్", "क्लासिक मोड", "स्क्रीन दिखाओ", "கிளாசிக் மோட்", "ಕ್ಲಾಸಿಕ್ ಮೋಡ್".
   -> category="SWITCH_TO_CLASSIC", intent="action"

3. SHELTER_QUERY: User asks about emergency safe shelters, flood relief camps, cyclone shelters, evacuation or safe places during disaster.
   Examples: "Where can I go if there is a flood?", "Show nearby safe shelters", "Where is the nearest emergency shelter?", "తుఫాను ఆశ్రయం ఎక్కడ ఉంది?", "బాధ్రతా కేంద్రాలు", "सुरक्षित आश्रय", "பாதுகாப்பு முகாம்".
   -> category="SHELTER_QUERY", intent="action"

4. LOCATION_CHANGE: User wants to check weather for or change location to another city or town.
   Examples: "Check weather in Vijayawada", "Change my location to Hyderabad", "Show me weather for Guntur", "స్థలం మార్చు", "स्थान बदलो".
   -> category="LOCATION_CHANGE", intent="current"

5. ALERT_QUERY: User asks about weather alerts, severe warnings, danger, storms, cyclones, heatwaves.
   Examples: "Are there any severe weather warnings?", "Is there a cyclone warning?", "Any danger alerts near me?", "ఏమైనా హెచ్చరికలు ఉన్నాయా?", "కోస్తా తుఫాను హెచ్చరిక ఉందా?", "क्या कोई चेतावनी है?".
   -> category="ALERT_QUERY", intent="alert"

6. ADVISORY_QUERY: Agricultural advice, farmer guidance, or outdoor work suitability.
   Examples: "What should farmers do today?", "Give me agricultural weather advice", "Can I spray pesticides today?", "రైతు సలహా ఏమిటి?", "आज खेती के लिए क्या सलाह है?".
   -> category="ADVISORY_QUERY", intent="advisory", needs_forecast=true

7. HOURLY_FORECAST: Weather for specific time today, this evening, tonight, afternoon, next few hours.
   Examples: "What will the weather be like this evening?", "How will weather change in next few hours?", "సాయంత్రం వాతావరణం ఎలా ఉంటుంది?".
   -> category="HOURLY_FORECAST", intent="forecast", needs_forecast=true

8. WEEKLY_FORECAST: Weather over next 7 days, this week, weekend.
   Examples: "How is the weather this week?", "What about the next seven days?", "Weekend weather?", "వచ్చే వారం వాతావరణం?".
   -> category="WEEKLY_FORECAST", intent="forecast", needs_forecast=true

9. WEATHER_QUERY: General current weather, temperature, rain today/tomorrow.
   Examples: "What is the weather today?", "Will it rain tomorrow?", "How hot will it be?", "ఈరోజు ఎండ / వర్షం?", "వాతావరణం ఎలా ఉంది?".
   -> category="WEATHER_QUERY", intent="current" or "forecast"

10. REPLAY_RESPONSE: User asks to repeat, replay, or speak the last response again.
    Examples: "Repeat that", "Say that again", "Replay", "మళ్లీ చెప్పు", "फिर से बोलो".
    -> category="REPLAY_RESPONSE", intent="action"

11. STOP_SPEAKING: User asks to stop talking, be quiet, hush, silence.
    Examples: "Stop talking", "Quiet", "Silence", "Shut up", "ఆపు", "చాలు", "चुप रहो".
    -> category="STOP_SPEAKING", intent="action"

12. HELP: User asks how to use or what assistant can do.
    Examples: "What can you do?", "Help me", "How does this work?", "సహాయం", "మనం ఏం చేయవచ్చు?".
    -> category="HELP", intent="general"

13. LANGUAGE_CHANGE: User wants to change language.
    Examples: "Switch to Telugu", "Speak in Hindi", "తెలుగులో మాట్లాడు", "हिंदी में बदलो".
    -> category="LANGUAGE_CHANGE", intent="action", target_language="te"|"hi"|"ta"|"kn"|"ml"|"mr"|"bn"|"en"

14. GENERAL_WEATHER_CONVERSATION: General weather questions or comments not requiring specific forecast.
    Examples: "Why does it rain?", "I love monsoon", "Why is it so humid in July?".
    -> category="GENERAL_WEATHER_CONVERSATION", intent="general"

Important Rules:
- If Indian language place name is mentioned, strip grammatical postpositions (-లో, -కి, -இல், -में, etc.) and write the standard English transliterated city name (e.g., "Tadepalligudem", "Vijayawada", "Hyderabad", "Guntur", "Visakhapatnam", "Chennai", "Bengaluru", "Delhi").
- Never output markdown fences. Return ONLY the raw JSON string.
"""

    data: dict = {}
    try:
        client = get_client()
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=300,
                automatic_function_calling=genai_types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        text = response.text.strip() if response and response.text else ""
        text = re.sub(r"```json\s*|\s*```", "", text).strip()
        data = json.loads(text)
    except Exception as e:
        print(f"[LLM Intent Extraction Warning] Gemini error: {e}")
        data = {}

    # Heuristic enhancements and safety fallbacks (guarantees dynamic matching even offline)
    msg_lower = message.lower().strip()
    category = data.get("category")

    # 1. Voice vs Classic Mode Heuristics
    if not category or category in {"GENERAL_WEATHER_CONVERSATION", "general"}:
        if any(w in msg_lower for w in [
            "classic mode", "normal screen", "show me the normal", "see the weather",
            "switch to text", "open classic", "classic", "text mode", "don't want voice",
            "dont want voice", "క్లాసిక్", "స్క్రీన్", "क्लासिक", "स्क्रीन"
        ]):
            data["category"] = "SWITCH_TO_CLASSIC"
            data["intent"] = "action"
        elif any(w in msg_lower for w in [
            "continue as voice", "continue with voice", "talk to me", "use voice",
            "want voice", "voice mode", "voice assistant", "keep talking",
            "talking to me", "వాయిస్", "ముజ్సే బాత్", "बात करो", "वॉइस", "ಧ್ವನಿ"
        ]):
            data["category"] = "SWITCH_TO_VOICE"
            data["intent"] = "action"
        elif any(w in msg_lower for w in [
            "shelter", "safe shelter", "flood", "cyclone shelter", "emergency shelter",
            "relief center", "relief camp", "ఆశ్రయం", "ఆశ్రయాలు", "బాధ్రత", "आश्रय", "राहत केंद्र"
        ]):
            data["category"] = "SHELTER_QUERY"
            data["intent"] = "action"
        elif any(w in msg_lower for w in ["warning", "alert", "danger", "cyclone", "storm", "హెచ్చరిక", "ప్రమాదం", "चेतावनी"]):
            data["category"] = "ALERT_QUERY"
            data["intent"] = "alert"
        elif any(w in msg_lower for w in ["farming", "farmer", "crop", "pesticide", "agricultural", "outdoor", "రైతు", "వ్యవసాయం", "खेती", "किसान"]):
            data["category"] = "ADVISORY_QUERY"
            data["intent"] = "advisory"
            data["needs_forecast"] = True
        elif any(w in msg_lower for w in ["stop", "quiet", "silence", "shut up", "hush", "ఆపు", "చాలు", "चुप रहो"]):
            data["category"] = "STOP_SPEAKING"
            data["intent"] = "action"
        elif any(w in msg_lower for w in ["repeat", "replay", "say again", "say that again", "మళ్లీ చెప్పు", "फिर से बोलो"]):
            data["category"] = "REPLAY_RESPONSE"
            data["intent"] = "action"
        elif any(w in msg_lower for w in ["what can you do", "help", "how to use", "సహాయం", "मदद"]):
            data["category"] = "HELP"
            data["intent"] = "general"

    # 2. Location detection
    loc = data.get("location")
    if not loc or loc.lower() in {"null", "none", "not specified", "here"}:
        match = re.search(
            r'\b(?:in|at|for|around|of|to)\s+([A-Za-z\s]+?)(?:\?|\.|\,|$|\s+(?:today|tomorrow|yesterday|this|next|suitable|now|weather|temperature|forecast))',
            message,
            re.IGNORECASE,
        )
        if match:
            candidate = match.group(1).strip()
            if len(candidate) > 2 and candidate.lower() not in {
                "the", "my", "our", "a", "an", "this", "that", "outdoor", "activities", "travel",
                "classic mode", "voice mode", "normal screen", "weather"
            }:
                loc = candidate
        if not loc and default_location and data.get("category") not in {"SWITCH_TO_CLASSIC", "SWITCH_TO_VOICE", "STOP_SPEAKING", "REPLAY_RESPONSE", "HELP"}:
            loc = default_location

    data["location"] = loc

    # 3. Date & forecast requirements
    if "tomorrow" in msg_lower or "రేపు" in message or "कल" in message:
        data["date_context"] = "tomorrow"
        data["needs_forecast"] = True
    elif any(w in msg_lower for w in ["next week", "weekend", "forecast", "upcoming", "7 days", "seven days", "this week", "next few days", "weekly", "వచ్చే వారం", "వాతావరణ సూచన", "अगले हफ्ते"]):
        data["category"] = data.get("category") or "WEEKLY_FORECAST"
        data["needs_forecast"] = True
    elif any(w in msg_lower for w in ["evening", "tonight", "afternoon", "next few hours", "సాయంత్రం", "शाम"]):
        data["category"] = data.get("category") or "HOURLY_FORECAST"
        data["needs_forecast"] = True

    # 4. Default fallbacks
    if "category" not in data or not data["category"]:
        data["category"] = "WEEKLY_FORECAST" if data.get("needs_forecast") else "WEATHER_QUERY"
    if "intent" not in data or not data["intent"]:
        if data["category"] in {"SWITCH_TO_CLASSIC", "SWITCH_TO_VOICE", "SHELTER_QUERY", "STOP_SPEAKING", "REPLAY_RESPONSE", "LANGUAGE_CHANGE"}:
            data["intent"] = "action"
        elif data["category"] in {"HOURLY_FORECAST", "WEEKLY_FORECAST"}:
            data["intent"] = "forecast"
        elif data["category"] == "ALERT_QUERY":
            data["intent"] = "alert"
        elif data["category"] == "ADVISORY_QUERY":
            data["intent"] = "advisory"
        else:
            data["intent"] = "current"

    if "needs_current" not in data:
        data["needs_current"] = True
    if "needs_forecast" not in data:
        data["needs_forecast"] = data.get("category") in {"HOURLY_FORECAST", "WEEKLY_FORECAST", "ADVISORY_QUERY"}
    return data


async def generate_weather_response(
    user_message: str,
    weather_context: dict,
    language: str = "en",
    chat_history: list[dict] | None = None,
) -> str:
    """
    Generate a natural-language weather response grounded in real weather data.
    """
    lang_name = LANGUAGE_NAMES.get(language, "English")
    weather_json = json.dumps(weather_context, indent=2, default=str)

    history_text = ""
    if chat_history:
        history_text = "\n\nPrevious conversation:\n"
        for msg in chat_history[-6:]:
            role = "User" if msg["role"] == "user" else "WeatherGPT"
            history_text += f"{role}: {msg['content']}\n"

    script_hint = LANGUAGE_SCRIPTS.get(language, "native script")
    prompt = f"""{SYSTEM_PROMPT}

Respond ONLY in {lang_name} using authentic {script_hint}.
Do NOT translate technical metric values (such as °C, km/h, %, mm) incorrectly. Keep the verified measurements accurate.
{history_text}

=== VERIFIED WEATHER DATA (use ONLY this data) ===
{weather_json}
=== END WEATHER DATA ===

User question: {user_message}

Provide a helpful, conversational answer based strictly on the weather data above in {lang_name}.
"""

    try:
        client = get_client()
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1024,
                automatic_function_calling=genai_types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        print(f"[LLM Service Warning] Gemini generate_content error: {e}")

    # Grounded fallback if LLM is unavailable
    current = weather_context.get("current", {})
    if current:
        loc = current.get("location_name") or current.get("location", "your area")
        temp = current.get("temperature_c", "N/A")
        desc = current.get("condition_description") or current.get("condition_text", "current conditions")
        hum = current.get("humidity_percent") or current.get("humidity_pct", "N/A")
        wind = current.get("wind_speed_kmh", "N/A")
        if language == "te":
            return f"ప్రస్తుతం {loc}లో వాతావరణం {desc}, ఉష్ణోగ్రత {temp}°C గా ఉంది. తేమ {hum}% మరియు గాలి వేగం {wind} km/h."
        elif language == "hi":
            return f"वर्तमान में {loc} में मौसम {desc} है, तापमान {temp}°C है। आर्द्रता {hum}% और हवा की गति {wind} km/h है।"
        elif language == "ta":
            return f"தற்போது {loc} இல் வானிலை {desc}, வெப்பநிலை {temp}°C ஆக உள்ளது. ஈரப்பதம் {hum}% மற்றும் காற்றின் வேகம் {wind} km/h."
        elif language == "kn":
            return f"ಪ್ರಸ್ತುತ {loc} ನಲ್ಲಿ ಹವಾಮಾನ {desc}, ತಾಪಮಾನ {temp}°C ಆಗಿದೆ. ತೇವಾಂಶ {hum}% ಮತ್ತು ಗಾಳಿಯ ವೇಗ {wind} km/h."
        elif language == "ml":
            return f"നിലവിൽ {loc} ൽ കാലാവസ്ഥ {desc}, താപനില {temp}°C ആണ്. ഈർപ്പം {hum}%, കാറ്റിന്റെ വേഗത {wind} km/h."
        elif language == "mr":
            return f"सध्या {loc} मध्ये हवामान {desc} आहे, तापमान {temp}°C आहे. आर्द्रता {hum}% आणि वाऱ्याचा वेग {wind} km/h आहे."
        elif language == "bn":
            return f"বর্তমানে {loc}-এ আবহাওয়া {desc}, তাপমাত্রা {temp}°C। আর্দ্রতা {hum}% এবং বাতাসের গতি {wind} km/h।"
        return f"Currently in {loc}, it is {temp}°C with {desc}. Humidity is {hum}% and wind speed is {wind} km/h."
    if language == "te":
        return "ఈ ప్రశ్నకు వాతావరణ సమాచారం ప్రస్తుతం అందుబాటులో లేదు. దయచేసి మీ ప్రాంతాన్ని సరిచూసి మళ్లీ ప్రయత్నించండి."
    elif language == "hi":
        return "इस प्रश्न के लिए मौसम की जानकारी फिलहाल उपलब्ध नहीं है। कृपया अपना स्थान जांचें और पुनः प्रयास करें।"
    elif language == "ta":
        return "இந்த கேள்விக்கான வானிலை தகவல் தற்போது கிடைக்கவில்லை. தயவுசெய்து உங்கள் இருப்பிடத்தை சரிபார்த்து மீண்டும் முயற்சிக்கவும்."
    elif language == "kn":
        return "ಈ ಪ್ರಶ್ನೆಗೆ ಹವಾಮಾನ ಮಾಹಿತಿ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
    elif language == "ml":
        return "ഈ ചോദ്യത്തിനുള്ള കാലാവസ്ഥാ വിവരം നിലവിൽ ലഭ്യമല്ല. ദയവായി നിങ്ങളുടെ സ്ഥലം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക."
    elif language == "mr":
        return "या प्रश्नासाठी हवामानाची माहिती सध्या उपलब्ध नाही. कृपया आपले स्थान तपासा आणि पुन्हा प्रयत्न करा."
    elif language == "bn":
        return "এই প্রশ্নের জন্য আবহাওয়ার তথ্য বর্তমানে উপলব্ধ নেই। অনুগ্রহ করে আপনার অবস্থান পরীক্ষা করুন এবং আবার চেষ্টা করুন।"
    return "Weather information is currently unavailable for this query. Please check your location or try again shortly."


async def generate_advisory_response(
    advisory_rules: list[dict],
    weather_summary: dict,
    category: str,
    language: str = "en",
) -> str:
    """
    Use Gemini to present rule-generated advisories in natural language.
    """
    lang_name = LANGUAGE_NAMES.get(language, "English")
    rules_text = "\n".join([f"- {a['recommendation']}" for a in advisory_rules])
    weather_text = json.dumps(weather_summary, indent=2, default=str)

    prompt = f"""{SYSTEM_PROMPT}

Respond ONLY in {lang_name}.

You are generating a {category} weather advisory.

=== CURRENT WEATHER (factual) ===
{weather_text}
=== END WEATHER ===

=== RULE-BASED RECOMMENDATIONS (present these, do not change the facts) ===
{rules_text}
=== END RECOMMENDATIONS ===

Present these recommendations in a friendly, clear, and well-organised way.
Do not add any weather information not present in the data above.
"""

    try:
        client = get_client()
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.6,
                max_output_tokens=1024,
                automatic_function_calling=genai_types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        print(f"[LLM Advisory Warning] Gemini error: {e}")

    # Fallback to rule recommendations directly
    if advisory_rules:
        recs = "\n".join([f"• {a['recommendation']}" for a in advisory_rules])
        return f"Here are the {category} recommendations for current conditions:\n\n{recs}"
    return f"Conditions are normal for {category}. No special precautions required at this time."


async def generate_alerts_explanation(
    alerts: list[dict],
    weather_summary: dict,
    location: str,
    language: str = "en",
) -> str:
    """
    Generate natural-language explanation of weather alerts grounded strictly in rule results and weather facts.
    """
    lang_name = LANGUAGE_NAMES.get(language, "English")
    if not alerts:
        if language == "te":
            return f"ప్రస్తుతం {location}లో ఎటువంటి తీవ్రమైన వాతావరణ హెచ్చరికలు లేవు. పరిస్థితులు సాధారణ పరిమితుల్లో ఉన్నాయి."
        return f"There are currently no active weather alerts for {location}. Atmospheric conditions are within normal safety thresholds."

    alerts_text = "\n".join([
        f"- [{a.get('severity', 'moderate').upper()}] {a.get('title')}: {a.get('description')} (Measured: {a.get('triggered_value')}, Threshold: {a.get('threshold_value')})"
        for a in alerts
    ])
    weather_text = json.dumps(weather_summary, indent=2, default=str)

    prompt = f"""{SYSTEM_PROMPT}

Respond ONLY in {lang_name}. If Telugu, write naturally and fluently in Telugu script (తెలుగు లిపి).

You are explaining active weather alerts for {location}.

=== CURRENT WEATHER (factual) ===
{weather_text}
=== END WEATHER ===

=== ACTIVE RULE-BASED ALERTS ===
{alerts_text}
=== END ALERTS ===

Provide a clear, urgent yet reassuring public safety summary for citizens.
Explain the main risks and recommend practical safety precautions based strictly on the alerts above.
Do not invent any alerts or numbers not listed above.
"""

    try:
        client = get_client()
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.6,
                max_output_tokens=1024,
                automatic_function_calling=genai_types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        print(f"[LLM Alerts Warning] Gemini error: {e}")

    # Grounded fallback if Gemini unavailable
    lines = [f"• [{a.get('severity', '').upper()}] {a.get('title')}: {a.get('description')}" for a in alerts]
    return "\n".join(lines)
