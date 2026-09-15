'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, RefreshCw, Sun, Moon, Globe, Mic, User, LogOut, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store';
import { useTranslation, INDIAN_LANGUAGES } from '@/lib/translations';
import { LocationPicker } from './LocationPicker';
import type { Language } from '@/types';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
    user,
    isAuthenticated,
    isGuest,
    logout,
    setAuthModalOpen,
    setVoiceModalOpen,
  } = useAppStore();

  const isDark = theme === 'dark';
  const { t } = useTranslation(language);

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLangMeta = INDIAN_LANGUAGES.find((l) => l.code === language) || INDIAN_LANGUAGES[0];

  return (
    <header className="flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-3 border-b border-slate-200 dark:border-white/[0.06] bg-white/80 dark:bg-gray-950/70 backdrop-blur-xl sticky top-0 z-20 transition-colors duration-200 shadow-xs">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Dynamic Location Picker */}
      <LocationPicker />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Voice Assistant Primary Button */}
        <button
          type="button"
          onClick={() => setVoiceModalOpen(true)}
          className="relative group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-all cursor-pointer active:scale-95"
          title="Open Voice Assistant"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <Mic size={14} className="text-white" />
          <span className="hidden sm:inline">Voice Assistant</span>
        </button>

        {/* 8-Language Selector Dropdown */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
            aria-label="Change language"
          >
            <Globe size={13} className="text-blue-500" />
            <span className="font-bold">{activeLangMeta.nativeName}</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Select Language
              </div>
              {INDIAN_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code as Language);
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    language === l.code
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{l.nativeName}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{l.englishName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Account / Sign In */}
        <div className="relative" ref={userMenuRef}>
          {isAuthenticated ? (
            <div>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline max-w-[100px] truncate">{user?.name || 'User'}</span>
                {isGuest && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                    Guest
                  </span>
                )}
                <ChevronDown size={12} className="text-slate-400 hidden sm:inline" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || 'Guest Account'}</p>
                  </div>
                  <button
                    onClick={async () => {
                      setUserDropdownOpen(false);
                      await logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <User size={13} />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Sun/Moon Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="relative p-2 rounded-xl border border-slate-300 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-white/20 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 transition-all duration-200 focus:outline-none cursor-pointer"
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Sun
              size={16}
              className={`absolute transition-all duration-300 transform text-amber-500 ${
                isDark ? 'opacity-0 rotate-90 scale-0 pointer-events-none' : 'opacity-100 rotate-0 scale-100'
              }`}
            />
            <Moon
              size={16}
              className={`absolute transition-all duration-300 transform text-blue-400 ${
                isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0 pointer-events-none'
              }`}
            />
          </div>
        </button>
      </div>
    </header>
  );
}
