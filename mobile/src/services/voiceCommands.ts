/**
 * Voice Command & Intent Resolution Engine for WeatherGPT.
 * Replaces hardcoded string-matching with a dynamic intent-driven architecture.
 *
 * Pipeline:
 * USER SPEAKS -> Audio/Transcript -> AI Intent Engine (FastAPI + Gemini)
 *   ├── UI / System Action (Mode switch, Shelters, Location, Language, Stop, Replay)
 *   └── Weather / Advisory / Alert Data Flow -> Natural Language Spoken Response
 */

import { VoiceQueryResponse } from './api';

export type CommandType =
  | 'SWITCH_MODE_CLASSIC'
  | 'SWITCH_MODE_VOICE'
  | 'STOP_SPEECH'
  | 'REPLAY_SPEECH'
  | 'SWITCH_LANGUAGE'
  | 'OPEN_LOCATION_PICKER'
  | 'SHOW_SAFE_SHELTERS';

export interface CommandDetectionResult {
  isCommand: boolean;
  commandType?: CommandType;
  payload?: any;
  feedbackText?: string;
  feedbackLanguage?: string;
  intent?: string;
}

/**
 * Resolves an action command from the backend VoiceQueryResponse.
 * This is the primary path: backend Gemini dynamically classifies any natural phrasing.
 */
export const resolveResponseCommand = (
  response: VoiceQueryResponse,
  currentLanguage: string = 'en'
): CommandDetectionResult => {
  const intent = response.intent;
  const action = response.intent_action;

  if (action === 'SWITCH_MODE_CLASSIC' || intent === 'SWITCH_TO_CLASSIC') {
    return {
      isCommand: true,
      commandType: 'SWITCH_MODE_CLASSIC',
      feedbackText: response.clean_speech_text || 'Switching to Classic Mode.',
      feedbackLanguage: response.language || currentLanguage,
      intent,
      payload: response.intent_payload,
    };
  }

  if (action === 'SWITCH_MODE_VOICE' || intent === 'SWITCH_TO_VOICE') {
    return {
      isCommand: true,
      commandType: 'SWITCH_MODE_VOICE',
      feedbackText: response.clean_speech_text || 'Voice Assistant is active.',
      feedbackLanguage: response.language || currentLanguage,
      intent,
      payload: response.intent_payload,
    };
  }

  if (action === 'SHOW_SAFE_SHELTERS' || intent === 'SHELTER_QUERY') {
    return {
      isCommand: true,
      commandType: 'SHOW_SAFE_SHELTERS',
      feedbackText: response.clean_speech_text,
      feedbackLanguage: response.language || currentLanguage,
      intent,
      payload: response.intent_payload,
    };
  }

  if (action === 'CHANGE_LOCATION' || intent === 'LOCATION_CHANGE') {
    return {
      isCommand: true,
      commandType: 'OPEN_LOCATION_PICKER',
      feedbackText: response.clean_speech_text,
      feedbackLanguage: response.language || currentLanguage,
      intent,
      payload: response.intent_payload,
    };
  }

  if (action === 'SWITCH_LANGUAGE' || intent === 'LANGUAGE_CHANGE') {
    return {
      isCommand: true,
      commandType: 'SWITCH_LANGUAGE',
      feedbackText: response.clean_speech_text,
      feedbackLanguage: response.language || currentLanguage,
      intent,
      payload: response.intent_payload,
    };
  }

  if (action === 'STOP_SPEECH' || intent === 'STOP_SPEAKING') {
    return {
      isCommand: true,
      commandType: 'STOP_SPEECH',
      intent,
    };
  }

  if (action === 'REPLAY_SPEECH' || intent === 'REPLAY_RESPONSE') {
    return {
      isCommand: true,
      commandType: 'REPLAY_SPEECH',
      intent,
    };
  }

  return {
    isCommand: false,
    intent: intent || 'WEATHER_QUERY',
  };
};

/**
 * Fast client-side semantic intent check.
 * Used for zero-latency local interruptions (e.g., immediate "stop" or "replay")
 * and offline/immediate UI action detection.
 */
export const detectVoiceCommand = (
  transcript: string,
  currentLanguage: string = 'en'
): CommandDetectionResult => {
  if (!transcript || !transcript.trim()) {
    return { isCommand: false };
  }

  const text = transcript.toLowerCase().trim().replace(/[.,?!]/g, '');

  // 1. Stop Speech (Immediate local action)
  if (
    /^(stop|quiet|silence|shut up|hush|halt|pause|ఆపు|చాలు|మాట ఆపు|రోకో|चुप|बंद करो|நிறுத்து|ನಿಲ್ಲಿಸು|നിർത്തുക)/i.test(text) ||
    text === 'stop' ||
    text === 'quiet' ||
    text === 'ఆపు' ||
    text === 'చాలు'
  ) {
    return {
      isCommand: true,
      commandType: 'STOP_SPEECH',
      intent: 'STOP_SPEAKING',
    };
  }

  // 2. Replay Speech (Immediate local action)
  if (
    /(replay|repeat|say (that )?again|read again|speak again|మళ్లీ చెప్పు|మరోసారి చెప్పు|फिर से बोलो|दोहराएं|மீண்டும் சொல்|ಮತ್ತೆ ಹೇಳು|വീണ്ടും പറയുക)/i.test(text)
  ) {
    return {
      isCommand: true,
      commandType: 'REPLAY_SPEECH',
      intent: 'REPLAY_RESPONSE',
    };
  }

  // 3. Switch to Classic Mode (Semantic match)
  if (
    /(classic mode|normal screen|switch to (classic|text)|open classic|exit voice|go to classic|don't want voice|see the weather|show cards|క్లాసిక్ మోడ్|క్లాసిక్|స్క్రీన్ చూపించు|क्लासिक मोड|क्लासिक|स्क्रीन दिखाओ|கிளாசிக் மோட்|ಕ್ಲಾಸಿಕ್)/i.test(text)
  ) {
    return {
      isCommand: true,
      commandType: 'SWITCH_MODE_CLASSIC',
      intent: 'SWITCH_TO_CLASSIC',
      feedbackText:
        currentLanguage === 'te'
          ? 'క్లాసిక్ మోడ్‌కి మారుతున్నాను.'
          : currentLanguage === 'hi'
          ? 'क्लासिक मोड में स्विच कर रहे हैं।'
          : 'Switching to Classic Mode.',
      feedbackLanguage: currentLanguage,
    };
  }

  // 4. Switch to Voice Mode (Semantic match)
  if (
    /(voice mode|voice assistant|continue (with|as) voice|talk to me|use voice|want voice|keep talking|talking to me|వాయిస్ మోడ్|వాయిస్ అసిస్టెంట్|వాయిస్|నాతో మాట్లాడు|वॉइस मोड|वॉइस असिस्टेंट|बात करो|ఆవాజ్ మోడ్|வாய்ஸ் மோட்|ವಾಯ್ಸ್)/i.test(text)
  ) {
    return {
      isCommand: true,
      commandType: 'SWITCH_MODE_VOICE',
      intent: 'SWITCH_TO_VOICE',
      feedbackText:
        currentLanguage === 'te'
          ? 'వాయిస్ అసిస్టెంట్ మోడ్‌కి మారుతున్నాను.'
          : currentLanguage === 'hi'
          ? 'वॉइस असिस्टेंट मोड में स्विच कर रहे हैं।'
          : 'Switching to Voice Assistant Mode.',
      feedbackLanguage: currentLanguage,
    };
  }

  // 5. Emergency Shelters (Semantic match)
  if (
    /(safe shelter|emergency shelter|flood shelter|cyclone shelter|relief center|relief camp|nearest shelter|where (can I|to) go if there is a flood|ఆశ్రయం|సురక్షిత ఆశ్రయం|సమీప ఆశ్రయాలు|తుఫాను ఆశ్రయం|ఆశ్రయం ఎక్కడ ఉంది|सुरक्षित आश्रय|निकटतम आश्रय|राहत केंद्र|பாதுகாப்பு முகாம்)/i.test(text)
  ) {
    return {
      isCommand: true,
      commandType: 'SHOW_SAFE_SHELTERS',
      intent: 'SHELTER_QUERY',
      feedbackText:
        currentLanguage === 'te'
          ? 'సమీపంలోని అధికారిక సురక్షిత ఆశ్రయాల వివరాలు పరిశీలిస్తున్నాను.'
          : currentLanguage === 'hi'
          ? 'निकटतम आधिकारिक सुरक्षित आश्रय स्थल खोजे जा रहे हैं।'
          : 'Searching for emergency safe shelters near your location.',
      feedbackLanguage: currentLanguage,
    };
  }

  // 6. Change Location (Semantic match)
  if (
    /(change (my )?location|switch location|select location|change city|different city|స్థలం మార్చు|ప్రాంతం మార్చు|ఊరు మార్చు|स्थान बदलो|शहर बदलो)/i.test(text)
  ) {
    return {
      isCommand: true,
      commandType: 'OPEN_LOCATION_PICKER',
      intent: 'LOCATION_CHANGE',
      feedbackText:
        currentLanguage === 'te'
          ? 'స్థానాన్ని ఎంచుకోండి.'
          : currentLanguage === 'hi'
          ? 'कृपया नया स्थान चुनें।'
          : 'Please select a location.',
      feedbackLanguage: currentLanguage,
    };
  }

  // Default: Let backend Gemini agent understand the full query dynamically
  return { isCommand: false, intent: 'WEATHER_QUERY' };
};
