/**
 * Mobile Zustand Store — Manages state for voice interaction, active language,
 * current location, authentication session, and cached responses.
 */

import { create } from 'zustand';
import { VoiceQueryResponse } from '../services/api';
import { StorageService, StoredUser } from '../services/storage';
import { ThemeMode, ThemeColors, getThemeColors } from '../theme/theme';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
export type AuthMode = 'voice' | 'classic';

interface MobileState {
  // Authentication & Session
  token: string | null;
  user: StoredUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  authMode: AuthMode;
  setAuth: (token: string | null, user: StoredUser | null, isGuest?: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
  logout: () => Promise<void>;

  // Language
  language: string;
  locale: string;
  nativeLanguageName: string;
  setLanguage: (code: string, locale: string, nativeName: string) => void;

  // Location
  location: string;
  hasSelectedLocation: boolean;
  coordinates: { latitude: number; longitude: number } | null;
  isGpsLocation: boolean;
  setLocation: (loc: string, coords?: { latitude: number; longitude: number } | null, isGps?: boolean) => void;
  setCoordinates: (coords: { latitude: number; longitude: number } | null, isGps?: boolean) => void;
  setHasSelectedLocation: (val: boolean) => void;

  // Voice State
  voiceStatus: VoiceStatus;
  setVoiceStatus: (status: VoiceStatus) => void;

  // Latest Exchange
  currentTranscript: string;
  setCurrentTranscript: (t: string) => void;
  lastResponse: VoiceQueryResponse | null;
  setLastResponse: (res: VoiceQueryResponse | null) => void;

  // User Profile
  userId: string | null;
  setUserId: (id: string) => void;

  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useMobileStore = create<MobileState>((set, get) => ({
  // Theme state
  theme: 'dark',
  setTheme: (theme: ThemeMode) => {
    StorageService.saveTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    StorageService.saveTheme(nextTheme);
    set({ theme: nextTheme });
  },

  // Auth state
  token: null,
  user: null,
  isAuthenticated: false,
  isGuest: false,
  authMode: 'voice',
  setAuth: (token, user, isGuest = false) => {
    if (token) {
      StorageService.saveToken(token);
    }
    if (user) {
      StorageService.saveUser(user);
    }
    set({
      token,
      user,
      isAuthenticated: !!token,
      isGuest,
      userId: user?.id || null,
      language: user?.preferred_language || get().language,
    });
  },
  setAuthMode: (authMode) => {
    StorageService.saveAuthMode(authMode);
    set({ authMode });
  },
  logout: async () => {
    await StorageService.clearAll();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isGuest: false,
      userId: null,
    });
  },

  // Language
  language: 'te', // Telugu default for high rural affinity in target region
  locale: 'te-IN',
  nativeLanguageName: 'తెలుగు',
  setLanguage: (code, locale, nativeName) =>
    set({ language: code, locale, nativeLanguageName: nativeName }),

  // Location
  location: 'Vijayawada',
  hasSelectedLocation: false,
  coordinates: { latitude: 16.5062, longitude: 80.6480 },
  isGpsLocation: false,
  setLocation: (location, coords = null, isGps = false) =>
    set((state) => ({
      location,
      hasSelectedLocation: true,
      coordinates: coords || state.coordinates,
      isGpsLocation: isGps,
    })),
  setCoordinates: (coordinates, isGps = true) =>
    set({ coordinates, isGpsLocation: isGps }),
  setHasSelectedLocation: (hasSelectedLocation) => set({ hasSelectedLocation }),

  // Voice State
  voiceStatus: 'idle',
  setVoiceStatus: (voiceStatus) => set({ voiceStatus }),

  // Latest Exchange
  currentTranscript: '',
  setCurrentTranscript: (currentTranscript) => set({ currentTranscript }),
  lastResponse: null,
  setLastResponse: (lastResponse) => set({ lastResponse }),

  // User Profile
  userId: null,
  setUserId: (userId) => set({ userId }),
}));
