// WeatherGPT — Utility functions

import type { AlertSeverity, AlertType } from '@/types';

// ── Temperature ───────────────────────────────────────────────────────────────

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

// ── Wind direction ────────────────────────────────────────────────────────────

export function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── Date/time ─────────────────────────────────────────────────────────────────

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Alert styling ─────────────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; text: string; border: string; badge: string }> = {
  low:      { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30',   badge: 'bg-blue-500/20 text-blue-300' },
  medium:   { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-300' },
  high:     { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', badge: 'bg-orange-500/20 text-orange-300' },
  critical: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30',    badge: 'bg-red-500/20 text-red-300' },
};

export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  heavy_rain:    '🌧️',
  extreme_heat:  '🌡️',
  strong_wind:   '💨',
  high_humidity: '💧',
  thunderstorm:  '⛈️',
  heavy_snowfall:'❄️',
};

// ── WMO weather code → emoji ──────────────────────────────────────────────────

export function weatherEmoji(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '⛅' : '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 75) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}

// ── Advisory category styling ─────────────────────────────────────────────────

export const ADVISORY_CATEGORY_CONFIG = {
  agriculture: { label: 'Agriculture',       icon: '🌾', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
  travel:      { label: 'Travel',             icon: '🚗', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  outdoor:     { label: 'Outdoor Activities', icon: '🏃', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  general:     { label: 'General Safety',     icon: '🛡️', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
};

import type { Language } from '@/types';

// ── Language labels ───────────────────────────────────────────────────────────

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  te: 'తెలుగు',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  bn: 'বাংলা',
};

