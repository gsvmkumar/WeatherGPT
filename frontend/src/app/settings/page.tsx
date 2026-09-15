'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { searchLocations, reverseGeocode } from '@/lib/api';
import type { LocationSearchResult, Language } from '@/types';
import { LANGUAGE_LABELS } from '@/lib/utils';
import { Search, MapPin, Globe, Check, User, LogOut, Navigation, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const {
    location,
    setLocation,
    language,
    setLanguage,
    user,
    isAuthenticated,
    isGuest,
    logout,
    setAuthModalOpen,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchLocations(query, 5);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (r: LocationSearchResult) => {
    setLocation({ name: r.name, latitude: r.latitude, longitude: r.longitude, country: r.country });
    setResults([]);
    setQuery('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUseGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setLocation({
            name: res.name || 'Current Location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            country: res.country || 'India',
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch {
          setLocation({
            name: 'Current Location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            country: 'India',
          });
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-slide-up pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-gray-400 text-sm mt-0.5">
          Customize your WeatherGPT profile, language, and location preferences
        </p>
      </div>

      {/* User Account & Profile */}
      <div className="glass-card p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-blue-500" />
          <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
            User Account
          </h2>
        </div>

        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{user?.name}</p>
                  {isGuest && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Guest Session
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.email || 'Guest access (preferences saved locally)'}
                </p>
              </div>
            </div>

            <button
              onClick={async () => await logout()}
              className="py-2 px-4 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Sign in to save your weather history
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sync your chat sessions and location across mobile and web.
              </p>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-auto"
            >
              Sign In or Register
            </button>
          </div>
        )}
      </div>

      {/* Default Location */}
      <div className="glass-card p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Default Location
            </h2>
          </div>
          <button
            onClick={handleUseGps}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
          >
            {locating ? <RefreshCw size={12} className="animate-spin" /> : <Navigation size={12} />}
            <span>{locating ? 'Detecting...' : 'Use Current GPS'}</span>
          </button>
        </div>

        {location && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <Check size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-blue-300">{location.name}</span>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">
              ({location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E)
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search city, district, or town..."
            className="flex-1 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <Search size={15} />
            <span>Search</span>
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-md">
            {results.map((r) => (
              <button
                key={r.display_name}
                onClick={() => selectLocation(r)}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                {r.state && <span className="text-slate-400 ml-1.5">{r.state},</span>}
                <span className="text-slate-400 ml-1">{r.country}</span>
              </button>
            ))}
          </div>
        )}
        {saved && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">✓ Location saved</p>}
      </div>

      {/* 8 Indian Languages */}
      <div className="glass-card p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-purple-500" />
          <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
            Primary Language (8 Supported)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => {
            const isSelected = language === code;
            return (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`p-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span className="text-sm block">{label}</span>
                <span className="text-[10px] text-slate-400 font-normal uppercase mt-0.5 block">{code}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Voice Assistant and AI responses will communicate in the selected language.
        </p>
      </div>

      {/* System info */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">WeatherGPT Architecture</p>
        <p>• Meteorology: Open-Meteo verified real-time observations</p>
        <p>• Conversational AI: Google Gemini 1.5 Flash grounded engine</p>
        <p>• Geocoding: OpenStreetMap Nominatim</p>
        <p>• Emergency Shelters: Official Disaster Management Authorities</p>
      </div>
    </div>
  );
}
