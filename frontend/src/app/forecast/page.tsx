'use client';

import { useState } from 'react';
import { useForecast } from '@/hooks/useWeather';
import { useAppStore } from '@/store';
import { formatTemp, formatTime } from '@/lib/utils';
import {
  RefreshCw,
  Droplets,
  Wind,
  Calendar,
  Clock,
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Sunrise,
  Sunset,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

function getWeatherIcon(code: number, isDay = true, size = 20) {
  if (code === 0) {
    return isDay ? (
      <Sun size={size} className="text-amber-500 dark:text-amber-400 drop-shadow-xs" />
    ) : (
      <Moon size={size} className="text-indigo-400 dark:text-indigo-300 drop-shadow-xs" />
    );
  }
  if (code <= 2) {
    return isDay ? (
      <CloudSun size={size} className="text-amber-500 dark:text-amber-300 drop-shadow-xs" />
    ) : (
      <Cloud size={size} className="text-slate-500 dark:text-slate-400 drop-shadow-xs" />
    );
  }
  if (code === 3) return <Cloud size={size} className="text-slate-500 dark:text-slate-400 drop-shadow-xs" />;
  if (code <= 48) return <CloudFog size={size} className="text-slate-500 dark:text-slate-400 drop-shadow-xs" />;
  if (code <= 55) return <CloudDrizzle size={size} className="text-blue-500 dark:text-blue-400 drop-shadow-xs" />;
  if (code <= 65) return <CloudRain size={size} className="text-blue-600 dark:text-blue-500 drop-shadow-xs" />;
  if (code <= 75) return <CloudSnow size={size} className="text-cyan-500 dark:text-cyan-300 drop-shadow-xs" />;
  if (code <= 82) return <CloudRain size={size} className="text-blue-600 dark:text-blue-500 drop-shadow-xs" />;
  if (code <= 99) return <CloudLightning size={size} className="text-purple-600 dark:text-purple-400 drop-shadow-xs" />;
  return <Sun size={size} className="text-amber-500 dark:text-amber-400 drop-shadow-xs" />;
}

function formatDayLabel(dateStr: string, index: number): { dayName: string; formattedDate: string } {
  const parts = dateStr.split('-');
  const d = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(dateStr);
  const dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
  const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { dayName, formattedDate };
}

export default function ForecastPage() {
  const location = useAppStore((s) => s.location);
  const theme = useAppStore((s) => s.theme);
  const isDark = theme !== 'light';

  const { data, loading, error, refetch } = useForecast(7);
  const [activeChartTab, setActiveChartTab] = useState<'temp' | 'rain'>('temp');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse-soft">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-300 dark:bg-slate-700/40 rounded-md"></div>
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700/20 rounded-md"></div>
          </div>
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700/30 rounded-lg"></div>
        </div>

        {/* Hourly skeleton strip */}
        <div className="glass-card p-5 space-y-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="h-4 w-36 bg-slate-300 dark:bg-slate-700/40 rounded"></div>
          <div className="flex gap-3 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 min-w-[90px] h-28 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/50"></div>
            ))}
          </div>
        </div>

        {/* Chart skeleton */}
        <div className="glass-card p-5 h-64 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"></div>

        {/* 7-day skeleton */}
        <div className="space-y-2.5">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-16 glass-card bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto mt-16 glass-card p-8 text-center space-y-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Forecast</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {error || 'No forecast data received from Open-Meteo.'}
          </p>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      </div>
    );
  }

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (!location) {
    return (
      <div className="max-w-xl mx-auto mt-16 glass-card p-8 text-center space-y-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <MapPin size={24} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No Location Selected</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Please select or search for a city in the header to view its 7-day forecast.
        </p>
      </div>
    );
  }

  // Next 24 hours of hourly data
  const next24Hours = data.hourly.slice(0, 24);

  // Hourly chart data
  const chartData = next24Hours.map((h) => ({
    time: formatTime(h.time),
    temp: Math.round(h.temperature_c),
    rain: h.rain_probability_pct,
    humidity: h.humidity_pct ?? 0,
    wind: Math.round(h.wind_speed_kmh),
  }));

  // Overall min and max temperature across all 7 days for range bars
  const weekMin = Math.min(...data.daily.map((d) => d.temp_min_c));
  const weekMax = Math.max(...data.daily.map((d) => d.temp_max_c));
  const weekRange = Math.max(weekMax - weekMin, 1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-slide-up pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Weather Forecast
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">
              Open-Meteo Live
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 flex items-center gap-1.5">
            <MapPin size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-200">{location.name}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">· 7-Day Outlook & 24-Hour Trends</span>
          </p>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer self-start sm:self-auto shadow-xs"
          title="Refresh forecast from Open-Meteo"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-blue-600 dark:text-blue-400'} />
          <span>{loading ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── 1. Hourly Forecast Carousel ────────────────────────────────────────── */}
      <div className="glass-card p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Clock size={17} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Hourly Forecast (Next 24 Hours)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Scroll horizontally →</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
          {next24Hours.map((h, i) => (
            <div
              key={h.time}
              className="flex-shrink-0 w-24 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col items-center text-center gap-1.5 hover:border-blue-500/60 dark:hover:border-blue-400/50 hover:shadow-md transition-all snap-start"
            >
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {i === 0 ? 'Now' : formatTime(h.time)}
              </span>

              <div className="my-1 drop-shadow-xs">
                {getWeatherIcon(h.condition_code, h.is_day, 24)}
              </div>

              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatTemp(h.temperature_c)}
              </span>

              <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-col gap-1 text-[11px]">
                <div
                  className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 font-semibold"
                  title="Rain probability"
                >
                  <Droplets size={11} className="stroke-[2.5]" />
                  <span>{h.rain_probability_pct}%</span>
                </div>
                <div
                  className="flex items-center justify-center gap-1 text-cyan-700 dark:text-cyan-300 font-semibold"
                  title="Relative humidity"
                >
                  <span className="text-[10px]">💧</span>
                  <span>{h.humidity_pct ?? 0}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Interactive 24-Hour Trend Chart ─────────────────────────────────── */}
      <div className="glass-card p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              24-Hour Trends
            </h2>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Interactive metrics progression over the next 24 hours
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/90 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 rounded-lg self-start">
            <button
              onClick={() => setActiveChartTab('temp')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeChartTab === 'temp'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              Temperature (°C)
            </button>
            <button
              onClick={() => setActiveChartTab('rain')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeChartTab === 'rain'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              Rain & Humidity (%)
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          {activeChartTab === 'temp' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={isDark ? 0.35 : 0.45} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={isDark ? 0 : 0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#334155' }}
                tickLine={false}
                axisLine={false}
                unit="°"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 8px 24px -4px rgba(15,23,42,0.12)',
                  color: isDark ? '#ffffff' : '#0f172a',
                }}
                labelStyle={{ color: isDark ? '#94a3b8' : '#1e293b', fontWeight: 700, marginBottom: 4 }}
                formatter={(v: unknown) => [`${v}°C`, 'Temperature']}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#d97706"
                strokeWidth={2.5}
                fill="url(#tempGrad)"
              />
            </AreaChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={isDark ? 0.35 : 0.45} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={isDark ? 0 : 0.05} />
                </linearGradient>
                <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#334155' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 8px 24px -4px rgba(15,23,42,0.12)',
                  color: isDark ? '#ffffff' : '#0f172a',
                }}
                labelStyle={{ color: isDark ? '#94a3b8' : '#1e293b', fontWeight: 700, marginBottom: 4 }}
                formatter={(v: unknown, name: unknown) => [
                  `${v}%`,
                  name === 'rain' ? 'Rain Chance' : 'Humidity',
                ]}
              />
              <Area
                type="monotone"
                dataKey="rain"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#rainGrad)"
              />
              <Area
                type="monotone"
                dataKey="humidity"
                stroke="#0891b2"
                strokeWidth={2}
                strokeDasharray="3 3"
                fill="url(#humGrad)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── 3. Comprehensive 7-Day Forecast ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Calendar size={17} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              7-Day Daily Forecast
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Click any day for details
          </span>
        </div>

        <div className="grid gap-2.5">
          {data.daily.map((day, i) => {
            const { dayName, formattedDate } = formatDayLabel(day.date, i);
            const isSelected = selectedDayIndex === i;

            // Range bar percentage calculation
            const barLeft = Math.max(0, ((day.temp_min_c - weekMin) / weekRange) * 100);
            const barWidth = Math.max(12, ((day.temp_max_c - day.temp_min_c) / weekRange) * 100);

            return (
              <div
                key={day.date}
                onClick={() => setSelectedDayIndex(isSelected ? null : i)}
                className={`glass-card glass-card-hover p-4 transition-all cursor-pointer bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shadow-xs ${
                  isSelected
                    ? 'ring-2 ring-blue-500/60 border-blue-500/70 bg-blue-50/40 dark:bg-blue-500/10 shadow-sm'
                    : 'hover:border-slate-300 dark:hover:border-white/[0.14]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Day, Date & Condition */}
                  <div className="flex items-center gap-3.5 min-w-[200px]">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-center flex-shrink-0">
                      {getWeatherIcon(day.condition_code, true, 22)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{dayName}</p>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{formattedDate}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 capitalize font-medium">
                        {day.condition_text}
                      </p>
                    </div>
                  </div>

                  {/* Weather Metrics: Rain, Humidity, Wind */}
                  <div className="flex items-center gap-3 text-xs">
                    {/* Rain probability */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/20 min-w-[65px]"
                      title="Precipitation Probability"
                    >
                      <Droplets size={13} className="stroke-[2.5]" />
                      <span className="font-semibold">{day.rain_probability_pct}%</span>
                    </div>

                    {/* Relative Humidity */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-500/20 min-w-[65px]"
                      title="Average Relative Humidity"
                    >
                      <span className="text-xs">💧</span>
                      <span className="font-semibold">{day.humidity_pct ?? 0}%</span>
                    </div>

                    {/* Wind Speed */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 min-w-[75px]"
                      title="Maximum Wind Speed"
                    >
                      <Wind size={13} />
                      <span className="font-medium">{Math.round(day.wind_speed_max_kmh)} km/h</span>
                    </div>
                  </div>

                  {/* High/Low Temperatures & Visual Range Bar */}
                  <div className="flex items-center gap-3 min-w-[220px] justify-end">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold w-8 text-right">
                      {formatTemp(day.temp_min_c)}
                    </span>

                    {/* Horizontal Visual Range Bar */}
                    <div className="hidden sm:block flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative min-w-[90px]">
                      <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-rose-500"
                        style={{
                          left: `${barLeft}%`,
                          width: `${barWidth}%`,
                        }}
                      />
                    </div>

                    <span className="text-sm font-bold text-slate-900 dark:text-white w-9 text-right">
                      {formatTemp(day.temp_max_c)}
                    </span>
                  </div>
                </div>

                {/* Expanded Details on Click */}
                {isSelected && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-fade-in">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                      <Sunrise size={16} className="text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Sunrise</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {day.sunrise ? formatTime(day.sunrise) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                      <Sunset size={16} className="text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Sunset</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {day.sunset ? formatTime(day.sunset) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                      <Droplets size={16} className="text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Precipitation Sum</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {day.precipitation_sum_mm.toFixed(1)} mm
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                      <Wind size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Max Wind Speed</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {Math.round(day.wind_speed_max_kmh)} km/h
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
