/**
 * WeatherGPT Mobile API Client
 * Interacts with the FastAPI backend for voice queries, weather data, alerts, and user profiles.
 */

import axios from 'axios';
import { NativeModules } from 'react-native';

// Dynamically resolve backend host:
// 1. From Metro bundler host IP in Expo Go (works seamlessly when connecting from real phone)
// 2. Fallback to PC's active LAN IP (10.10.42.212)
export const getBackendBaseUrl = (): string => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (
        match &&
        match[1] &&
        match[1] !== 'localhost' &&
        match[1] !== '127.0.0.1' &&
        match[1] !== '10.0.2.2'
      ) {
        return `http://${match[1]}:8000`;
      }
    }
  } catch {}
  return 'http://10.10.42.212:8000';
};

import { useMobileStore } from '../store/useMobileStore';

export const BACKEND_URL = getBackendBaseUrl();

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update baseURL dynamically and attach Bearer JWT token if user is authenticated
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBackendBaseUrl();
  const token = useMobileStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired or unauthorized sessions automatically
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && useMobileStore.getState().isAuthenticated) {
      console.log('Session expired or unauthorized (401), clearing mobile session');
      await useMobileStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

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
  weather_data?: {
    location: string;
    temperature_c: number;
    feels_like_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    rain_probability_pct: number;
    condition_text: string;
    condition_code: number;
    is_day: boolean;
  };
  recognized_text?: string;
  intent?: string;
  intent_action?: string;
  intent_payload?: any;
}

export interface LanguageMeta {
  code: string;
  locale: string;
  name: string;
  native_name: string;
  script: string;
  greeting: string;
  sample_prompts: string[];
}

export interface LocationSearchResult {
  name: string;
  state?: string;
  country: string;
  display_name: string;
  latitude: number;
  longitude: number;
}

export interface HourlyForecastItem {
  time: string;
  temperature_c: number;
  humidity_pct: number;
  rain_probability_pct: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  condition_code: number;
  condition_text: string;
  is_day: boolean;
}

export interface DailyForecastItem {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  humidity_pct: number;
  rain_probability_pct: number;
  precipitation_sum_mm: number;
  wind_speed_max_kmh: number;
  condition_code: number;
  condition_text: string;
  sunrise: string;
  sunset: string;
}

export interface ForecastResponse {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
}

export interface HistoricalWeatherItem {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  temp_mean_c: number;
  precipitation_sum_mm: number;
  wind_speed_max_kmh: number;
}

export interface HistoricalWeatherData {
  location: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  data: HistoricalWeatherItem[];
}

export interface ShelterItem {

  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  source: string;
  source_reference: string;
  verification_status: 'verified_official' | 'map_listed' | 'unverified';
  facility_type: string;
  contact_information: string;
  capacity?: number;
  distance_km: number;
  created_at: string;
  updated_at: string;
}

export interface SheltersResponse {
  count: number;
  user_latitude: number;
  user_longitude: number;
  radius_km: number;
  shelters: ShelterItem[];
  safety_advisory: string;
  has_verified_shelters: boolean;
}

export const WeatherApi = {
  // Emergency Shelters
  getNearbyShelters: async (
    lat: number,
    lon: number,
    radiusKm: number = 35.0,
    language: string = 'en'
  ): Promise<SheltersResponse> => {
    const res = await apiClient.get(
      `/api/shelters/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}&language=${language}`
    );
    return res.data;
  },
  // System Health
  checkHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Voice
  getLanguages: async (): Promise<LanguageMeta[]> => {
    const res = await apiClient.get('/api/voice/languages');
    return res.data.languages;
  },

  sendVoiceQuery: async (payload: VoiceQueryPayload): Promise<VoiceQueryResponse> => {
    const res = await apiClient.post('/api/voice/query', payload);
    return res.data;
  },

  sendAudioQuery: async (
    audioUri: string,
    language: string,
    location?: string,
    sessionId?: string
  ): Promise<VoiceQueryResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'voice_query.m4a',
    } as any);
    formData.append('language', language);
    if (location) formData.append('location', location);
    if (sessionId) formData.append('session_id', sessionId);

    const res = await apiClient.post('/api/voice/audio-query', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data,
    });
    return res.data;
  },

  // Weather & Alerts
  getCurrentWeather: async (location: string, language: string = 'en', lat?: number, lon?: number) => {
    let url = `/api/weather/current?location=${encodeURIComponent(location)}&language=${language}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  },

  getForecast: async (location: string, days: number = 7, lat?: number, lon?: number): Promise<ForecastResponse> => {
    let url = `/api/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  },

  getHistoricalWeather: async (
    location: string,
    lat?: number,
    lon?: number,
    start?: string,
    end?: string
  ): Promise<HistoricalWeatherData> => {
    let url = `/api/weather/history?location=${encodeURIComponent(location)}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    if (start && end) {
      url += `&start=${start}&end=${end}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  },

  reverseGeocode: async (lat: number, lon: number): Promise<LocationSearchResult> => {

    const res = await apiClient.get(`/api/locations/reverse?lat=${lat}&lon=${lon}`);
    return res.data;
  },

  getAlerts: async (location: string, language: string = 'en') => {
    const res = await apiClient.get(`/api/alerts?location=${encodeURIComponent(location)}&language=${language}`);
    return res.data;
  },

  getAdvisories: async (location: string, language: string = 'en') => {
    const res = await apiClient.get(`/api/advisories?location=${encodeURIComponent(location)}&language=${language}`);
    return res.data;
  },

  searchLocations: async (query: string): Promise<LocationSearchResult[]> => {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await apiClient.get(`/api/locations/search?q=${encodeURIComponent(query.trim())}&limit=5`);
      return res.data;
    } catch {
      return [];
    }
  },

  // User & Saved Locations
  createUser: async (name: string, preferred_language: string = 'te') => {
    const res = await apiClient.post('/api/users', { name, preferred_language });
    return res.data;
  },

  saveLocation: async (userId: string, location_name: string, latitude: number, longitude: number, is_default: boolean = true) => {
    const res = await apiClient.post(`/api/users/${userId}/locations`, {
      location_name,
      latitude,
      longitude,
      is_default,
    });
    return res.data;
  },

  registerDeviceToken: async (userId: string, push_token: string, platform: string = 'android') => {
    const res = await apiClient.post(`/api/users/${userId}/device-tokens`, {
      push_token,
      platform,
    });
    return res.data;
  },

  // ── Authentication & Onboarding Endpoints ──────────────────────────────
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    confirm_password: string;
    preferred_language?: string;
  }): Promise<{ access_token: string; is_new_user: boolean; user: any; verification_token?: string; email_delivery_status?: string }> => {
    const res = await apiClient.post('/api/auth/register', payload);
    return res.data;
  },

  login: async (payload: {
    email: string;
    password: string;
  }): Promise<{ access_token: string; is_new_user: boolean; user: any }> => {
    const res = await apiClient.post('/api/auth/login', payload);
    return res.data;
  },

  verifyEmail: async (token: string): Promise<{ status: string; message: string; email_verified: boolean }> => {
    const res = await apiClient.post('/api/auth/verify-email', { token });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ status: string; message: string; reset_token?: string }> => {
    const res = await apiClient.post('/api/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (payload: {
    token: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post('/api/auth/reset-password', payload);
    return res.data;
  },

  googleLogin: async (idToken: string): Promise<{ access_token: string; is_new_user: boolean; user: any }> => {
    const res = await apiClient.post('/api/auth/google', { id_token: idToken });
    return res.data;
  },

  guestLogin: async (name: string = 'Guest Farmer', preferred_language: string = 'te'): Promise<{ access_token: string; is_new_user: boolean; user: any }> => {
    const res = await apiClient.post('/api/auth/guest', { name, preferred_language });
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },

  updateUserLanguage: async (userId: string, language: string) => {
    const res = await apiClient.put(`/api/users/${userId}/language`, { preferred_language: language });
    return res.data;
  },

  logoutUser: async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {}
  },
};
