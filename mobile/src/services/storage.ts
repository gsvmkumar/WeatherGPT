/**
 * Secure Session Storage for WeatherGPT Mobile.
 * Uses Expo SecureStore for encrypted local persistence on Android & iOS.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'weathergpt_auth_token';
const USER_KEY = 'weathergpt_user_profile';
const MODE_KEY = 'weathergpt_auth_mode';
const THEME_KEY = 'weathergpt_app_theme';

export interface StoredUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_language: string;
  is_guest?: boolean;
}

export const StorageService = {
  saveToken: async (token: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.warn('SecureStore saveToken error:', e);
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn('SecureStore getToken error:', e);
      return null;
    }
  },

  saveUser: async (user: StoredUser): Promise<void> => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('SecureStore saveUser error:', e);
    }
  },

  getUser: async (): Promise<StoredUser | null> => {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('SecureStore getUser error:', e);
      return null;
    }
  },

  saveAuthMode: async (mode: 'voice' | 'classic'): Promise<void> => {
    try {
      await SecureStore.setItemAsync(MODE_KEY, mode);
    } catch (e) {
      console.warn('SecureStore saveAuthMode error:', e);
    }
  },

  getAuthMode: async (): Promise<'voice' | 'classic'> => {
    try {
      const mode = await SecureStore.getItemAsync(MODE_KEY);
      return mode === 'classic' || mode === 'voice' ? mode : 'voice';
    } catch (e) {
      return 'voice';
    }
  },

  saveTheme: async (theme: 'light' | 'dark'): Promise<void> => {
    try {
      await SecureStore.setItemAsync(THEME_KEY, theme);
    } catch (e) {
      console.warn('SecureStore saveTheme error:', e);
    }
  },

  getTheme: async (): Promise<'light' | 'dark' | null> => {
    try {
      const theme = await SecureStore.getItemAsync(THEME_KEY);
      return theme === 'light' || theme === 'dark' ? theme : null;
    } catch (e) {
      console.warn('SecureStore getTheme error:', e);
      return null;
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (e) {
      console.warn('SecureStore clearAll error:', e);
    }
  },
};
