/**
 * WeatherGPT Mobile — Theme System
 * Defines colors, tokens, and contrast-safe styles for Light and Dark themes.
 * Preserves WeatherGPT's brand identity (sky-blue accents, emerald agronomic badges, amber sun)
 * across both themes while ensuring high readability and rural accessibility.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  isDark: boolean;
  theme: ThemeMode;

  // Backgrounds
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceCard: string;
  surfaceElevated: string;
  surfaceHighlight: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderHighlight: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Brand Accents
  accent: string;
  accentHover: string;
  accentBg: string;
  accentBorder: string;

  // Functional / Weather Colors
  sun: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  successBorder: string;

  // Form Inputs
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  // Pills, Badges & Chips
  chipBg: string;
  chipBorder: string;
  chipText: string;

  // Modals & Overlays
  overlay: string;
  modalBg: string;
  modalBorder: string;

  // System
  statusBar: 'light-content' | 'dark-content';
  statusBg: string;
}

export const DARK_THEME: ThemeColors = {
  isDark: true,
  theme: 'dark',

  // Backgrounds
  background: '#090d16',
  backgroundSecondary: '#0f172a',
  surface: '#0f172a',
  surfaceCard: '#131e33',
  surfaceElevated: '#1e293b',
  surfaceHighlight: '#24324d',

  // Borders
  border: '#1e293b',
  borderSubtle: '#334155',
  borderHighlight: '#38bdf8',

  // Typography
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Brand Accents
  accent: '#38bdf8',
  accentHover: '#0284c7',
  accentBg: 'rgba(56, 189, 248, 0.12)',
  accentBorder: 'rgba(56, 189, 248, 0.28)',

  // Functional / Weather Colors
  sun: '#f59e0b',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.25)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(239, 68, 68, 0.25)',
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.25)',

  // Form Inputs
  inputBg: '#1e293b',
  inputBorder: '#334155',
  inputText: '#f8fafc',
  inputPlaceholder: '#64748b',

  // Pills, Badges & Chips
  chipBg: '#1e293b',
  chipBorder: '#334155',
  chipText: '#e2e8f0',

  // Modals & Overlays
  overlay: 'rgba(0, 0, 0, 0.8)',
  modalBg: '#0f172a',
  modalBorder: '#1e293b',

  // System
  statusBar: 'light-content',
  statusBg: '#090d16',
};

export const LIGHT_THEME: ThemeColors = {
  isDark: false,
  theme: 'light',

  // Backgrounds — Clean, outdoor-readable slate/cloud palette
  background: '#f8fafc',
  backgroundSecondary: '#f1f5f9',
  surface: '#ffffff',
  surfaceCard: '#ffffff',
  surfaceElevated: '#f1f5f9',
  surfaceHighlight: '#e2e8f0',

  // Borders — Distinct separation on white/light backgrounds
  border: '#e2e8f0',
  borderSubtle: '#cbd5e1',
  borderHighlight: '#0284c7',

  // Typography — Deep slate-900 & slate-700 for crisp sunlight legibility
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',

  // Brand Accents — High-contrast sky-600 with clean tinted surfaces
  accent: '#0284c7',
  accentHover: '#0369a1',
  accentBg: 'rgba(2, 132, 199, 0.10)',
  accentBorder: 'rgba(2, 132, 199, 0.30)',

  // Functional / Weather Colors
  sun: '#d97706',
  warning: '#d97706',
  warningBg: 'rgba(217, 119, 6, 0.10)',
  warningBorder: 'rgba(217, 119, 6, 0.30)',
  danger: '#dc2626',
  dangerBg: 'rgba(220, 38, 38, 0.10)',
  dangerBorder: 'rgba(220, 38, 38, 0.30)',
  success: '#059669',
  successBg: 'rgba(5, 150, 105, 0.10)',
  successBorder: 'rgba(5, 150, 105, 0.30)',

  // Form Inputs
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  inputText: '#0f172a',
  inputPlaceholder: '#94a3b8',

  // Pills, Badges & Chips
  chipBg: '#ffffff',
  chipBorder: '#cbd5e1',
  chipText: '#1e293b',

  // Modals & Overlays
  overlay: 'rgba(15, 23, 42, 0.55)',
  modalBg: '#ffffff',
  modalBorder: '#e2e8f0',

  // System
  statusBar: 'dark-content',
  statusBg: '#f8fafc',
};

export const getThemeColors = (theme: ThemeMode): ThemeColors => {
  return theme === 'light' ? LIGHT_THEME : DARK_THEME;
};
