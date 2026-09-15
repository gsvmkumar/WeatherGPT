'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentWeather, getForecast, getAlerts, getAdvisories } from '@/lib/api';
import { useAppStore } from '@/store';
import type { CurrentWeather, ForecastData, AlertsResponse, AdvisoriesResponse } from '@/types';

// ── useCurrentWeather ─────────────────────────────────────────────────────────

export function useCurrentWeather() {
  const location = useAppStore((s) => s.location);
  const [data, setData] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCurrentWeather({ lat: location.latitude, lon: location.longitude });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── useForecast ───────────────────────────────────────────────────────────────

export function useForecast(days = 7) {
  const location = useAppStore((s) => s.location);
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getForecast({ lat: location.latitude, lon: location.longitude, days });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch forecast');
    } finally {
      setLoading(false);
    }
  }, [location, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── useAlerts ─────────────────────────────────────────────────────────────────

export function useAlerts() {
  const location = useAppStore((s) => s.location);
  const language = useAppStore((s) => s.language);
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAlerts({
        lat: location.latitude,
        lon: location.longitude,
        language,
      });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [location, language]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── useAdvisories ─────────────────────────────────────────────────────────────

export function useAdvisories() {
  const location = useAppStore((s) => s.location);
  const language = useAppStore((s) => s.language);
  const [data, setData] = useState<AdvisoriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdvisories({
        lat: location.latitude,
        lon: location.longitude,
        language,
      });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch advisories');
    } finally {
      setLoading(false);
    }
  }, [location, language]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
