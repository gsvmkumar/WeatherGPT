import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { searchLocations, reverseGeocode } from '@/lib/api';
import type { LocationSearchResult } from '@/types';
import { MapPin, Search, X, RefreshCw, AlertCircle, Check, Navigation } from 'lucide-react';


export function LocationPicker() {
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation(language);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setNotFoundMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setNotFoundMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await reverseGeocode(latitude, longitude);
          setLocation({
            name: res.name || 'Current Location',
            latitude,
            longitude,
            country: res.country || 'India',
          });
          setIsOpen(false);
        } catch (e) {
          setLocation({
            name: 'Current Location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            country: 'India',
          });
          setIsOpen(false);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setNotFoundMessage('Could not retrieve device location. Please enable location permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };


  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSearched(false);
      setNotFoundMessage(null);
    }
  }, [isOpen]);

  // Debounced search handler
  const executeSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      setNotFoundMessage(null);
      return;
    }

    setLoading(true);
    setNotFoundMessage(null);

    try {
      const data = await searchLocations(trimmed, 8);
      if (data && data.length > 0) {
        setResults(data);
        setNotFoundMessage(null);
      } else {
        setResults([]);
        setNotFoundMessage(
          language === 'te'
            ? `'${trimmed}' కోసం ఎటువంటి భారతీయ ప్రాంతాలు కనుగొనబడలేదు.`
            : `No matching Indian locations found for '${trimmed}'.`
        );
      }
    } catch (err: any) {
      setResults([]);
      setNotFoundMessage(
        language === 'te'
          ? `'${trimmed}' కోసం ఎటువంటి ప్రాంతాలు కనుగొనబడలేదు. దయచేసి సరైన పేరును టైప్ చేయండి.`
          : `No matching locations found for '${trimmed}'. Please check the spelling.`
      );
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [language]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
    }, 280);
  };

  const handleSelectLocation = (item: LocationSearchResult) => {
    setLocation({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country || 'India',
    });
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelectLocation(results[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button: Shows current location with pin icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-blue-500/40 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/60 dark:hover:bg-white/[0.08] text-slate-700 dark:text-gray-300 text-xs font-semibold transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        title="Search or change location"
        aria-label="Location search"
      >
        <MapPin size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0 animate-pulse" />
        <span className="font-bold text-slate-900 dark:text-white max-w-[140px] sm:max-w-[180px] truncate">
          {location?.name ?? 'Search Location'}
        </span>
        <Search size={12} className="text-slate-400 dark:text-gray-500 ml-1 flex-shrink-0" />
      </button>

      {/* Dropdown Search Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-slide-up">
          {/* Search Input Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5 bg-slate-50/70 dark:bg-slate-950/40">
            <Search size={16} className="text-slate-400 dark:text-gray-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                language === 'te'
                  ? 'భారతీయ నగరాలు, పట్టణాలు, జిల్లాలను వెతకండి...'
                  : 'Search Indian cities, towns, mandals, districts...'
              }
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin flex-shrink-0" />}
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setNotFoundMessage(null);
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick GPS Location Button */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {locating ? (
                <RefreshCw size={13} className="animate-spin text-blue-600" />
              ) : (
                <Navigation size={13} className="text-blue-600 dark:text-blue-400" />
              )}
              <span>{locating ? 'Detecting GPS location...' : 'Use Current Device Location'}</span>
            </button>
          </div>

          {/* Results List / Status Area */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">

            {/* Initial Prompt when query is empty */}
            {!query && (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-gray-400">
                <MapPin size={24} className="mx-auto mb-2 text-slate-300 dark:text-gray-600" />
                <p className="font-medium text-slate-700 dark:text-gray-300">
                  {language === 'te' ? 'ప్రాంతాన్ని వెతకండి' : 'Type to search any Indian location'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                  e.g., Tadepalligudem, Kakinada, Bhimavaram, Delhi...
                </p>
              </div>
            )}

            {/* Clear Location Not Found Message */}
            {searched && notFoundMessage && (
              <div className="p-4 text-center">
                <AlertCircle size={24} className="mx-auto mb-2 text-amber-500" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'te' ? 'ప్రాంతం కనుగొనబడలేదు' : 'Location Not Found'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  {notFoundMessage}
                </p>
              </div>
            )}

            {/* Location Matches */}
            {results.map((item, idx) => {
              const isSelected =
                location?.name.toLowerCase() === item.name.toLowerCase() &&
                Math.abs(location.latitude - item.latitude) < 0.05;

              return (
                <button
                  key={`${item.name}-${item.latitude}-${item.longitude}-${idx}`}
                  type="button"
                  onClick={() => handleSelectLocation(item)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <MapPin size={12} className={isSelected ? 'text-blue-600' : 'text-slate-400 dark:text-gray-500'} />
                      <span className="truncate">{item.name}</span>
                      {item.state && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-gray-300 font-normal truncate">
                          {item.state}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 truncate pl-4">
                      {item.display_name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 pl-4 font-mono">
                      {item.latitude.toFixed(3)}°N, {item.longitude.toFixed(3)}°E
                    </p>
                  </div>
                  {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mr-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
