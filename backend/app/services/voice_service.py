"""
Voice Service — Speech text formatting, normalization, and language definitions
for mobile voice-first interaction across 8 Indian languages.
"""

import re
from typing import Any

# Supported 8 Indian languages with BCP-47 locales and voice configuration
SUPPORTED_VOICE_LANGUAGES = [
    {
        "code": "en",
        "locale": "en-IN",
        "name": "English",
        "native_name": "English",
        "script": "Latin",
        "greeting": "Hello! Ask me any weather question.",
        "sample_prompts": [
            "What is the weather in Vijayawada?",
            "Will it rain tomorrow?",
            "Is today suitable for farming?",
        ],
    },
    {
        "code": "te",
        "locale": "te-IN",
        "name": "Telugu",
        "native_name": "తెలుగు",
        "script": "Telugu",
        "greeting": "నమస్కారం! వాతావరణం గురించి ఏదైనా అడగండి.",
        "sample_prompts": [
            "విజయవాడలో వాతావరణం ఎలా ఉంది?",
            "రేపు వర్షం పడుతుందా?",
            "వ్యవసాయానికి ఈరోజు అనుకూలమా?",
        ],
    },
    {
        "code": "hi",
        "locale": "hi-IN",
        "name": "Hindi",
        "native_name": "हिन्दी",
        "script": "Devanagari",
        "greeting": "नमस्ते! मौसम के बारे में कोई भी सवाल पूछें।",
        "sample_prompts": [
            "दिल्ली में आज का मौसम कैसा है?",
            "क्या कल बारिश होगी?",
            "क्या आज खेती के लिए अच्छा दिन है?",
        ],
    },
    {
        "code": "ta",
        "locale": "ta-IN",
        "name": "Tamil",
        "native_name": "தமிழ்",
        "script": "Tamil",
        "greeting": "வணக்கம்! வானிலை பற்றி எதையும் கேளுங்கள்.",
        "sample_prompts": [
            "சென்னையில் இன்று வானிலை எப்படி?",
            "நாளை மழை பெய்யுமா?",
            "விவசாயத்திற்கு இன்றைய நாள் உகந்ததா?",
        ],
    },
    {
        "code": "kn",
        "locale": "kn-IN",
        "name": "Kannada",
        "native_name": "ಕನ್ನಡ",
        "script": "Kannada",
        "greeting": "ನಮಸ್ಕಾರ! ಹವಾಮಾನದ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ.",
        "sample_prompts": [
            "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇಂದಿನ ಹವಾಮಾನ ಹೇಗಿದೆ?",
            "ನಾಳೆ ಮಳೆ ಬರುತ್ತದೆಯೇ?",
            "ಕೃಷಿ ಕೆಲಸಕ್ಕೆ ಇಂದು ಸೂಕ್ತವೇ?",
        ],
    },
    {
        "code": "ml",
        "locale": "ml-IN",
        "name": "Malayalam",
        "native_name": "മലയാളം",
        "script": "Malayalam",
        "greeting": "നമസ്കാരം! കാലാവസ്ഥയെക്കുറിച്ച് എന്തും ചോദിക്കാം.",
        "sample_prompts": [
            "കൊച്ചിയിലെ ഇന്നത്തെ കാലാവസ്ഥ എങ്ങനെ?",
            "നാളെ മഴ പെയ്യുമോ?",
            "ഇന്ന് കൃഷിപ്പണിക്ക് അനുയോജ്യമാണോ?",
        ],
    },
    {
        "code": "mr",
        "locale": "mr-IN",
        "name": "Marathi",
        "native_name": "मराठी",
        "script": "Devanagari",
        "greeting": "नमस्कार! हवामानाबद्दल काहीही विचारा.",
        "sample_prompts": [
            "पुण्यात आजचे हवामान कसे आहे?",
            "उद्या पाऊस पडेल का?",
            "आज शेतीच्या कामांसाठी अनुकूल आहे का?",
        ],
    },
    {
        "code": "bn",
        "locale": "bn-IN",
        "name": "Bengali",
        "native_name": "বাংলা",
        "script": "Bengali",
        "greeting": "নমস্কার! আবহাওয়া সম্পর্কে যেকোনো প্রশ্ন জিজ্ঞাসা করুন।",
        "sample_prompts": [
            "কলকাতায় আজকের আবহাওয়া কেমন?",
            "কাল কি বৃষ্টি হবে?",
            "আজ কি চাষের কাজের জন্য উপযুক্ত?",
        ],
    },
]

LANGUAGE_MAP: dict[str, dict[str, Any]] = {
    lang["code"]: lang for lang in SUPPORTED_VOICE_LANGUAGES
}


def clean_text_for_speech(text: str, language: str = "en") -> str:
    """
    Format and clean AI responses for natural Text-to-Speech playback.
    Strips markdown symbols, backticks, asterisks, bullet points, and URLs
    that would otherwise sound robotic or awkward when read by Android TTS engines.
    """
    if not text:
        return ""

    # Remove code blocks and inline code
    clean = re.sub(r"```[\s\S]*?```", "", text)
    clean = re.sub(r"`.*?`", "", clean)

    # Remove URLs
    clean = re.sub(r"https?://\S+|www\.\S+", "", clean)

    # Remove bold, italics markdown asterisks and underscores
    clean = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", clean)
    clean = re.sub(r"_{1,3}(.*?)_{1,3}", r"\1", clean)

    # Remove markdown headers (#, ##, ###)
    clean = re.sub(r"^#{1,6}\s*", "", clean, flags=re.MULTILINE)

    # Remove bullet points and numbered list markers
    clean = re.sub(r"^\s*[-*•]\s+", "", clean, flags=re.MULTILINE)
    clean = re.sub(r"^\s*\d+\.\s+", "", clean, flags=re.MULTILINE)

    # Clean up double newlines and excess spaces
    clean = re.sub(r"\n+", ". ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    # Metric phonetic enhancements for English TTS clarity
    if language == "en":
        clean = re.sub(r"(\d+(?:\.\d+)?)\s*°C\b", r"\1 degrees Celsius", clean)
        clean = re.sub(r"(\d+(?:\.\d+)?)\s*km/h\b", r"\1 kilometers per hour", clean)
        clean = re.sub(r"(\d+(?:\.\d+)?)\s*mm\b", r"\1 millimeters", clean)
        clean = re.sub(r"(\d+)\s*%", r"\1 percent", clean)

    return clean.strip()


def get_language_metadata(code: str) -> dict[str, Any]:
    """Get metadata for a language code, defaulting to English if unknown."""
    return LANGUAGE_MAP.get(code, LANGUAGE_MAP["en"])
