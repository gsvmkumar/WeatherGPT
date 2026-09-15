// WeatherGPT — API client
// All API calls go through this module. Base URL comes from environment variable.

import axios from 'axios';
import type {
  CurrentWeather,
  ForecastData,
  HistoricalWeatherData,
  AlertsResponse,
  AdvisoriesResponse,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ChatHistoryMessage,
  LocationSearchResult,
  AdvisoryCategory,
  AuthUser,
  AuthResponse,
  ShelterItem,
  SheltersResponse,
} from '@/types';


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer JWT token if user is authenticated in browser
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('weathergpt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

// Handle unauthorized session
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('weathergpt_token');
        localStorage.removeItem('weathergpt_user');
      } catch {}
    }
    return Promise.reject(error);
  }
);


// ── Weather ───────────────────────────────────────────────────────────────────

export async function getCurrentWeather(params: {
  location?: string;
  lat?: number;
  lon?: number;
}): Promise<CurrentWeather> {
  const { data } = await api.get<CurrentWeather>('/api/weather/current', { params });
  return data;
}

export async function getForecast(params: {
  location?: string;
  lat?: number;
  lon?: number;
  days?: number;
}): Promise<ForecastData> {
  const { data } = await api.get<ForecastData>('/api/weather/forecast', { params });
  return data;
}

export async function getHistoricalWeather(params: {
  location?: string;
  lat?: number;
  lon?: number;
  start?: string;
  end?: string;
}): Promise<HistoricalWeatherData> {
  const { data } = await api.get<HistoricalWeatherData>('/api/weather/history', { params });
  return data;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(params: {
  location?: string;
  lat?: number;
  lon?: number;
  language?: string;
}): Promise<AlertsResponse> {
  const { data } = await api.get<AlertsResponse>('/api/alerts', { params });
  return data;
}

// ── Advisories ────────────────────────────────────────────────────────────────

export async function getAdvisories(params: {
  location?: string;
  lat?: number;
  lon?: number;
  category?: AdvisoryCategory;
  language?: string;
}): Promise<AdvisoriesResponse> {
  const { data } = await api.get<AdvisoriesResponse>('/api/advisories', { params });
  return data;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/api/chat', request);
  return data;
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatHistoryMessage[]>(`/api/chat/history/${sessionId}`);
  return data.map((d) => ({
    id: d.id,
    role: d.role,
    content: d.content,
    timestamp: d.created_at,
    weather_data: d.weather_data,
  }));
}

export async function clearChatHistory(sessionId: string): Promise<{ status: string }> {
  const { data } = await api.delete<{ status: string }>(`/api/chat/history/${sessionId}`);
  return data;
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function searchLocations(q: string, limit = 5): Promise<LocationSearchResult[]> {
  const { data } = await api.get<LocationSearchResult[]>('/api/locations/search', {
    params: { q, limit },
  });
  return data;
}

export async function checkHealth(): Promise<{ status: string }> {
  const { data } = await api.get('/health');
  return data;
}

// ── Reverse Geocode ───────────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lon: number): Promise<LocationSearchResult> {
  const { data } = await api.get<LocationSearchResult>('/api/locations/reverse', {
    params: { lat, lon },
  });
  return data;
}

// ── Emergency Safe Shelters ───────────────────────────────────────────────────

export async function getNearbyShelters(
  lat: number,
  lon: number,
  radiusKm = 35.0,
  language = 'en'
): Promise<SheltersResponse> {
  const { data } = await api.get<SheltersResponse>('/api/shelters/nearby', {
    params: { lat, lon, radius_km: radiusKm, language },
  });
  return data;
}

// ── Authentication ───────────────────────────────────────────────────────────

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  confirm_password?: string;
  preferred_language?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', {
    ...payload,
    confirm_password: payload.confirm_password || payload.password,
  });
  return data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', payload);
  return data;
}

export async function guestLogin(payload?: {
  name?: string;
  preferred_language?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/guest', {
    name: payload?.name || 'Guest User',
    preferred_language: payload?.preferred_language || 'en',
  });
  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/api/auth/me');
  return data;
}

export async function logoutUser(): Promise<{ status: string }> {
  try {
    const { data } = await api.post<{ status: string }>('/api/auth/logout');
    return data;
  } catch {
    return { status: 'logged_out' };
  }
}

// ── Voice ────────────────────────────────────────────────────────────────────

export interface VoiceQueryPayload {
  message: string;
  language: string;
  session_id?: string;
  location?: string;
  lat?: number;
  lon?: number;
}

export interface VoiceQueryResponse {
  session_id: string;
  language: string;
  locale: string;
  message: string;
  clean_speech_text: string;
  weather_data_used: boolean;
  location_resolved?: string;
  weather_data?: any;
  recognized_text?: string;
  intent?: string;
  intent_action?: string;
  intent_payload?: any;
}

export async function sendVoiceQuery(payload: VoiceQueryPayload): Promise<VoiceQueryResponse> {
  const { data } = await api.post<VoiceQueryResponse>('/api/voice/query', payload);
  return data;
}

export async function getVoiceLanguages(): Promise<any[]> {
  const { data } = await api.get('/api/voice/languages');
  return data.languages;
}

export default api;

