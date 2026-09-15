// Zustand global store — location, language, authentication, and UI state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppLocation, Language, AuthUser } from '@/types';
import { logoutUser } from '@/lib/api';

export type Theme = 'dark' | 'light';

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Location
  location: AppLocation | null;
  setLocation: (location: AppLocation) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Authentication & Session
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  setAuth: (token: string | null, user: AuthUser | null, isGuest?: boolean) => void;
  logout: () => Promise<void>;

  // UI Modals
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  voiceModalOpen: boolean;
  setVoiceModalOpen: (open: boolean) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('weathergpt_theme', theme);
    } catch {
      // ignore
    }
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme — default to dark
      theme: 'dark',
      setTheme: (theme) => {
        applyThemeToDocument(theme);
        set({ theme });
      },
      toggleTheme: () => {
        set((s) => {
          const nextTheme: Theme = s.theme === 'dark' ? 'light' : 'dark';
          applyThemeToDocument(nextTheme);
          return { theme: nextTheme };
        });
      },

      // Location — default to Vijayawada (primary demo city)
      location: {
        name: 'Vijayawada',
        latitude: 16.5062,
        longitude: 80.648,
        timezone: 'Asia/Kolkata',
      },
      setLocation: (location) => set({ location }),

      // Language
      language: (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE as Language) || 'en',
      setLanguage: (language) => set({ language }),

      // Authentication
      token: null,
      user: null,
      isAuthenticated: false,
      isGuest: false,
      setAuth: (token, user, isGuest = false) => {
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('weathergpt_token', token);
          } else {
            localStorage.removeItem('weathergpt_token');
          }
          if (user) {
            localStorage.setItem('weathergpt_user', JSON.stringify(user));
          } else {
            localStorage.removeItem('weathergpt_user');
          }
        }
        set({
          token,
          user,
          isAuthenticated: !!token,
          isGuest,
          language: (user?.preferred_language as Language) || get().language,
        });
      },
      logout: async () => {
        try {
          await logoutUser();
        } catch {}
        if (typeof window !== 'undefined') {
          localStorage.removeItem('weathergpt_token');
          localStorage.removeItem('weathergpt_user');
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isGuest: false,
        });
      },

      // UI Modals
      authModalOpen: false,
      setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
      voiceModalOpen: false,
      setVoiceModalOpen: (voiceModalOpen) => set({ voiceModalOpen }),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'weathergpt-store',
      partialize: (state) => ({
        theme: state.theme,
        location: state.location,
        language: state.language,
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToDocument(state.theme);
        }
      },
    }
  )
);

