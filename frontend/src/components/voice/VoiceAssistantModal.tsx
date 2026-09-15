'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { useTranslation, INDIAN_LANGUAGES } from '@/lib/translations';
import { sendVoiceQuery, VoiceQueryResponse } from '@/lib/api';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowRight,
  Shield,
  MapPin,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type VoiceState = 'IDLE' | 'SPEAKING' | 'LISTENING' | 'PROCESSING' | 'ERROR';

export function VoiceAssistantModal() {
  const router = useRouter();
  const {
    voiceModalOpen,
    setVoiceModalOpen,
    location,
    language,
    setLanguage,
  } = useAppStore();

  const { t } = useTranslation(language);

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState<VoiceQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Active language info
  const langMeta = INDIAN_LANGUAGES.find((l) => l.code === language) || INDIAN_LANGUAGES[0];

  // Stop speech & recognition when modal closes
  useEffect(() => {
    if (!voiceModalOpen) {
      stopSpeaking();
      stopListening();
      setVoiceState('IDLE');
      setTranscript('');
      setLastResponse(null);
    } else {
      // Trigger Initial Voice Greeting when opened
      playInitialGreeting();
    }
  }, [voiceModalOpen]);

  // Initial greeting playback on open
  const playInitialGreeting = () => {
    const greeting = langMeta.greeting;
    setTranscript('');
    setLastResponse({
      session_id: 'welcome_greeting',
      language,
      locale: langMeta.locale,
      message: greeting,
      clean_speech_text: greeting,
      weather_data_used: false,
    });

    speakText(greeting, () => {
      // Automatic handoff: starts listening as soon as AI finishes speaking greeting
      startListening();
    });
  };

  // Text-To-Speech function using browser SpeechSynthesis
  const speakText = (text: string, onDoneCallback?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    // Cancel any active speech
    window.speechSynthesis.cancel();
    stopListening();

    setVoiceState('SPEAKING');
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMeta.locale;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      if (onDoneCallback) {
        onDoneCallback();
      } else {
        // Continuous conversational loop
        startListening();
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      if (onDoneCallback) {
        onDoneCallback();
      } else {
        setVoiceState('IDLE');
      }
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    activeUtteranceRef.current = null;
  };

  // Speech-To-Text function using Web Speech API
  const startListening = () => {
    if (isSpeakingRef.current) {
      stopSpeaking();
    }

    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. You can type queries below.'
      );
      setVoiceState('IDLE');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = langMeta.locale;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setVoiceState('LISTENING');
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setTranscript(resultTranscript);

        if (event.results[current].isFinal) {
          handleVoiceQuery(resultTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          setVoiceState('IDLE');
          return;
        }
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        }
        setVoiceState('IDLE');
      };

      recognition.onend = () => {
        if (voiceState === 'LISTENING') {
          setVoiceState('IDLE');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setVoiceState('IDLE');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  };

  // Send Recognized Text to Gemini Backend Intent & Weather Engine
  const handleVoiceQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    stopListening();
    setVoiceState('PROCESSING');
    setErrorMessage(null);

    try {
      const response = await sendVoiceQuery({
        message: trimmed,
        language,
        location: location?.name,
        lat: location?.latitude,
        lon: location?.longitude,
      });

      setLastResponse(response);

      // Handle Dynamic Intent Actions
      if (response.intent_action === 'SWITCH_TO_CLASSIC' || response.intent === 'SWITCH_TO_CLASSIC') {
        speakText(response.clean_speech_text || response.message, () => {
          setVoiceModalOpen(false);
        });
        return;
      }

      if (response.intent_action === 'SHOW_SAFE_SHELTERS' || response.intent === 'SHELTER_QUERY') {
        speakText(response.clean_speech_text || response.message, () => {
          setVoiceModalOpen(false);
          router.push('/shelters');
        });
        return;
      }

      if (response.intent_action === 'SWITCH_TO_VOICE' || response.intent === 'SWITCH_TO_VOICE') {
        speakText(response.clean_speech_text || response.message, () => {
          startListening();
        });
        return;
      }

      // Default weather query or conversation: Speak answer and listen again
      speakText(response.clean_speech_text || response.message, () => {
        startListening();
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to process voice query.';
      setErrorMessage(msg);
      setVoiceState('ERROR');
    }
  };

  if (!voiceModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-lg p-6 sm:p-8 bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col items-center text-center overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar controls */}
        <div className="w-full flex items-center justify-between mb-4 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Voice Assistant · {langMeta.nativeName}</span>
          </div>

          <button
            onClick={() => setVoiceModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            title="Switch to classic mode"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Voice Pulse Visualizer */}
        <div className="my-6 relative flex items-center justify-center">
          {voiceState === 'LISTENING' && (
            <>
              <span className="animate-ping absolute inline-flex h-36 w-36 rounded-full bg-blue-500/20" />
              <span className="animate-pulse absolute inline-flex h-28 w-28 rounded-full bg-blue-500/40" />
            </>
          )}

          {voiceState === 'SPEAKING' && (
            <>
              <span className="animate-ping absolute inline-flex h-36 w-36 rounded-full bg-purple-500/20" />
              <span className="animate-pulse absolute inline-flex h-28 w-28 rounded-full bg-purple-500/30" />
            </>
          )}

          {voiceState === 'PROCESSING' && (
            <span className="animate-spin absolute inline-flex h-28 w-28 rounded-full border-2 border-dashed border-blue-400" />
          )}

          <button
            type="button"
            onClick={() => {
              if (voiceState === 'SPEAKING') {
                stopSpeaking();
                setVoiceState('IDLE');
              } else if (voiceState === 'LISTENING') {
                stopListening();
                setVoiceState('IDLE');
              } else {
                startListening();
              }
            }}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
              voiceState === 'LISTENING'
                ? 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-blue-500/50 scale-105'
                : voiceState === 'SPEAKING'
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {voiceState === 'SPEAKING' ? (
              <Volume2 size={36} className="animate-pulse" />
            ) : voiceState === 'PROCESSING' ? (
              <RefreshCw size={32} className="animate-spin" />
            ) : (
              <Mic size={36} />
            )}
          </button>
        </div>

        {/* State Label */}
        <div className="mb-4">
          <p className="text-sm font-bold tracking-wider uppercase text-slate-300">
            {voiceState === 'LISTENING'
              ? 'Listening to you... Speak now'
              : voiceState === 'SPEAKING'
              ? 'WeatherGPT Speaking...'
              : voiceState === 'PROCESSING'
              ? 'Understanding your query...'
              : 'Tap microphone to speak'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Say &quot;Classic mode&quot;, &quot;Safe shelter&quot;, or ask any weather question
          </p>
        </div>

        {/* Live Transcript / AI Response Card */}
        <div className="w-full min-h-[100px] max-h-48 overflow-y-auto p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-left mb-4 shadow-inner">
          {transcript && (
            <div className="mb-2">
              <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0.5">
                You said:
              </span>
              <p className="text-xs text-slate-200 font-medium italic">&quot;{transcript}&quot;</p>
            </div>
          )}

          {lastResponse && (
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block mb-0.5">
                WeatherGPT:
              </span>
              <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                {lastResponse.message}
              </p>

              {lastResponse.weather_data && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-white">
                    {lastResponse.weather_data.location}
                  </span>
                  <span>{lastResponse.weather_data.temperature_c}°C · {lastResponse.weather_data.condition_text}</span>
                </div>
              )}
            </div>
          )}

          {!transcript && !lastResponse && (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
              Speak in {langMeta.nativeName} or English. WeatherGPT is listening...
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-left">
            {errorMessage}
          </div>
        )}

        {/* Text Input Fallback Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualInput.trim()) {
              setTranscript(manualInput.trim());
              handleVoiceQuery(manualInput.trim());
              setManualInput('');
            }
          }}
          className="w-full flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800"
        >
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={`Type in ${langMeta.nativeName} or English...`}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <Send size={13} />
          </button>
        </form>

        {/* Quick Action Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => handleVoiceQuery('Switch to classic mode')}
            className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/80 cursor-pointer"
          >
            📱 Switch to Classic Mode
          </button>
          <button
            type="button"
            onClick={() => handleVoiceQuery('Where is the nearest safe shelter?')}
            className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/80 cursor-pointer"
          >
            🛡️ Safe Shelters
          </button>
          <button
            type="button"
            onClick={() => handleVoiceQuery(`How is the weather today in ${location?.name || 'my city'}?`)}
            className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/80 cursor-pointer"
          >
            🌦️ Weather Today
          </button>
        </div>
      </div>
    </div>
  );
}
