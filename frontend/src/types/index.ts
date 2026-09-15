// WeatherGPT — Shared TypeScript types

// ── Weather ──────────────────────────────────────────────────────────────────

export interface CurrentWeather {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  fetched_at: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  condition_code: number;
  condition_text: string;
  precipitation_mm: number;
  rain_probability_pct: number;
  is_day: boolean;
}

export interface HourlyForecastItem {
  time: string;
  temperature_c: number;
  humidity_pct?: number;
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
  humidity_pct?: number;
  rain_probability_pct: number;
  precipitation_sum_mm: number;
  wind_speed_max_kmh: number;
  condition_code: number;
  condition_text: string;
  sunrise: string;
  sunset: string;
}

export interface ForecastData {
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

// ── Alerts ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType =
  | 'heavy_rain'
  | 'extreme_heat'
  | 'strong_wind'
  | 'high_humidity'
  | 'thunderstorm'
  | 'heavy_snowfall';

export interface WeatherAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  triggered_value: number;
  threshold_value: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  location?: string | null;
  reason?: string | null;
}

export interface AlertsResponse {
  location: string;
  total: number;
  alerts: WeatherAlert[];
  ai_explanation?: string | null;
}

// ── Advisories ────────────────────────────────────────────────────────────────

export type AdvisoryCategory = 'agriculture' | 'travel' | 'outdoor' | 'general';

export interface Advisory {
  id: string;
  category: AdvisoryCategory;
  recommendation: string;
  generated_at: string;
}

export interface AdvisoriesResponse {
  location: string;
  total: number;
  advisories: Advisory[];
  ai_explanation?: string | null;
  weather_summary?: Record<string, unknown> | null;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type Language = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn';

export interface WeatherSnapshot {
  location: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  rain_probability_pct: number;
  condition_text: string;
  condition_code: number;
  is_day: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  weather_data?: WeatherSnapshot | null;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  language: Language;
  location?: string;
  lat?: number;
  lon?: number;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  language: Language;
  weather_data_used: boolean;
  location_resolved: string | null;
  weather_data?: WeatherSnapshot | null;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  created_at: string;
  weather_data?: WeatherSnapshot | null;
}

// ── Location ─────────────────────────────────────────────────────────────────

export interface LocationSearchResult {
  name: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  display_name: string;
}

export interface AppLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  timezone?: string;
}

// ── Authentication ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string | null;
  name: string;
  preferred_language: string;
  is_guest?: boolean;
  is_verified?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  is_new_user: boolean;
  user: AuthUser;
  verification_token?: string;
}

// ── Shelters ─────────────────────────────────────────────────────────────────

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

