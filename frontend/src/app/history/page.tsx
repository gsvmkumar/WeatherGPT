'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { getHistoricalWeather } from '@/lib/api';
import type { HistoricalWeatherData } from '@/types';
import { RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend,
} from 'recharts';

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const location = useAppStore((s) => s.location);
  const [data, setData] = useState<HistoricalWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    try {
      const result = await getHistoricalWeather({
        lat: location.latitude,
        lon: location.longitude,
        start: fmt(start),
        end: fmt(end),
      });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [location?.latitude, location?.longitude]);

  const chartData = data?.data.map((d) => ({
    date: formatShortDate(d.date),
    maxTemp: Math.round(d.temp_max_c),
    minTemp: Math.round(d.temp_min_c),
    meanTemp: Math.round(d.temp_mean_c),
    rain: Math.round(d.precipitation_sum_mm * 10) / 10,
  })) ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Historical Weather</h1>
          <p className="text-gray-500 text-sm mt-0.5">{location?.name} · Last 30 days</p>
        </div>
        <button onClick={fetchHistory} className="p-2 glass-card glass-card-hover rounded-xl text-gray-400 hover:text-white">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={28} className="text-blue-400 animate-spin" />
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <>
          {/* Temperature trend */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Temperature Trend (°C)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="maxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="minGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Area type="monotone" dataKey="maxTemp" name="Max °C" stroke="#ef4444" strokeWidth={2} fill="url(#maxGrad)" />
                <Area type="monotone" dataKey="minTemp" name="Min °C" stroke="#60a5fa" strokeWidth={2} fill="url(#minGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Precipitation */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Daily Precipitation (mm)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [`${v} mm`, 'Rain']}
                />
                <Bar dataKey="rain" name="Rain mm" fill="#60a5fa" radius={[3, 3, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
