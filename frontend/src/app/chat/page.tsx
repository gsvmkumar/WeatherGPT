'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { sendChatMessage, getChatHistory, clearChatHistory } from '@/lib/api';
import {
  Send,
  Bot,
  User,
  RefreshCw,
  Sparkles,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Trash2,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import type { ChatMessage, Language, WeatherSnapshot } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SUGGESTED_QUESTIONS = [
  'What is the weather in Vijayawada?',
  'Will it rain tomorrow in Hyderabad?',
  'What is the temperature in Delhi today?',
  'Is tomorrow suitable for outdoor activities?',
  'How is the weather today?',
];

import { useTranslation } from '@/lib/translations';

function WeatherCard({ data }: { data: WeatherSnapshot }) {
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation(language);

  return (
    <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold">
          <MapPin size={13} className="flex-shrink-0" />
          <span>{data.location}</span>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 font-semibold">
          {data.condition_text}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Temperature */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 flex-shrink-0">
            <Thermometer size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.temp}</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {data.temperature_c}°C
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
              {t.feelsLike} {data.feels_like_c}°C
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
            <Droplets size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.humidity}</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {data.humidity_pct}%
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
              {t.moisture}
            </div>
          </div>
        </div>

        {/* Wind */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex-shrink-0">
            <Wind size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.wind}</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {data.wind_speed_kmh} km/h
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
              {t.speed}
            </div>
          </div>
        </div>

        {/* Precipitation */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex-shrink-0">
            <CloudRain size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.rainChance}</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {data.rain_probability_pct}%
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
              {t.probability}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
        }`}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className={`max-w-[88%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
              : 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm shadow-xs'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {!isUser && message.weather_data && (
            <WeatherCard data={message.weather_data} />
          )}
        </div>

        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
        <Bot size={15} />
      </div>
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-xs">
        <div className="flex gap-1.5 items-center h-4">
          <span className="typing-dot text-purple-500 dark:text-purple-400" />
          <span className="typing-dot text-purple-500 dark:text-purple-400" />
          <span className="typing-dot text-purple-500 dark:text-purple-400" />
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-2">
          Consulting Open-Meteo & Gemini...
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const location = useAppStore((s) => s.location);
  const language = useAppStore((s) => s.language) as Language;
  const { t } = useTranslation(language);

  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize session and load chat history from PostgreSQL
  useEffect(() => {
    let currentId = '';
    try {
      const stored = localStorage.getItem('weathergpt_chat_session_id');
      if (stored) {
        currentId = stored;
      } else {
        currentId = uuidv4();
        localStorage.setItem('weathergpt_chat_session_id', currentId);
      }
    } catch {
      currentId = uuidv4();
    }
    setSessionId(currentId);

    // Fetch existing conversation from backend
    (async () => {
      try {
        const history = await getChatHistory(currentId);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            {
              id: uuidv4(),
              role: 'assistant',
              content: t.welcomeMessage.replace('{location}', location?.name ?? 'your city'),
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        setMessages([
          {
            id: uuidv4(),
            role: 'assistant',
            content: t.welcomeMessage.replace('{location}', location?.name ?? 'your city'),
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [location?.name, language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleClearChat = async () => {
    if (!sessionId) return;
    try {
      await clearChatHistory(sessionId);
    } catch (e) {
      console.warn('Could not clear remote history:', e);
    }

    const newId = uuidv4();
    try {
      localStorage.setItem('weathergpt_chat_session_id', newId);
    } catch {}
    setSessionId(newId);

    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: t.conversationRefreshed.replace('{location}', location?.name ?? 'your city'),
        timestamp: new Date().toISOString(),
      },
    ]);
    setErrorBanner(null);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setErrorBanner(null);

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage({
        session_id: sessionId || uuidv4(),
        message: trimmed,
        language,
        location: location?.name,
        lat: location?.latitude,
        lon: location?.longitude,
      });

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        weather_data: response.weather_data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        (language === 'te'
          ? 'వెదర్ జీపీటీ సేవ అందుబాటులో లేదు. దయచేసి సర్వర్ నడుస్తుందో లేదో తనిఖీ చేయండి.'
          : 'Unable to reach WeatherGPT API. Please verify the server is running.');
      setErrorBanner(errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-4xl mx-auto animate-slide-up">
      {/* Header bar */}
      <div className="glass-card p-4 mb-3 flex items-center justify-between gap-3 flex-shrink-0 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xs">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {t.chatTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {t.chatGrounded}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t.chatSubtitle} • {location?.name ?? 'India'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            disabled={loading || historyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
            title={t.clearChat}
            aria-label={t.clearChat}
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">{t.clearChat}</span>
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {errorBanner && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-400 flex-shrink-0 shadow-xs">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span className="flex-1 font-medium">{errorBanner}</span>
          <button
            onClick={() => setErrorBanner(null)}
            className="hover:underline font-bold ml-2 cursor-pointer"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {/* Message scroll container */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4 min-h-0">
        {historyLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw size={24} className="text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions (quick prompts) */}
      {messages.length <= 2 && !historyLoading && (
        <div className="py-2 flex-shrink-0">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t.suggestedQuestions}
          </div>
          <div className="flex flex-wrap gap-2">
            {((t.sampleQuestions as string[]) || SUGGESTED_QUESTIONS).map((q: string) => (
              <button

                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-xs transition-all text-left disabled:opacity-50 cursor-pointer font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="glass-card flex items-end gap-2 p-2.5 sm:p-3 flex-shrink-0 mt-1 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.chatPlaceholder.replace('{location}', location?.name ?? 'your city')}
          rows={1}
          disabled={loading}
          className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-none outline-none max-h-28 py-1.5 px-2"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0 shadow-xs cursor-pointer active:scale-95"
          aria-label={t.send}
        >
          <Send size={15} className="text-white" />
        </button>
      </div>
    </div>
  );
}
