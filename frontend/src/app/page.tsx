'use client';

import { useCurrentWeather, useAlerts } from '@/hooks/useWeather';
import { useAppStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { weatherEmoji, formatTemp, windDirectionLabel, SEVERITY_COLORS, ALERT_TYPE_ICONS } from '@/lib/utils';
import { Wind, Droplets, Thermometer, Eye, MapPin, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="glass-card glass-card-hover p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
        <Icon size={16} className="text-gray-600" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const location = useAppStore((s) => s.location);
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation(language);
  const { data: weather, loading, error, refetch } = useCurrentWeather();
  const { data: alertsData } = useAlerts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto" />
          <p className="text-gray-400">{t.loadingWeather}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <p className="text-red-400 text-lg font-medium">{t.couldNotLoadWeather}</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={refetch} className="text-blue-400 hover:text-blue-300 text-sm underline">
          {t.tryAgain}
        </button>
      </div>
    );
  }

  const activeAlerts = alertsData?.alerts?.filter((a) => a.is_active) ?? [];

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      {/* Hero weather card */}
      <div className="glass-card p-6 md:p-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={14} className="text-blue-400" />
              <span className="text-sm text-gray-400">{weather?.location ?? location?.name}</span>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-8xl" aria-label={weather?.condition_text}>
                {weather ? weatherEmoji(weather.condition_code, weather.is_day) : '🌡️'}
              </span>
              <div>
                <p className="text-6xl font-bold text-white">
                  {weather ? formatTemp(weather.temperature_c) : '--'}
                </p>
                <p className="text-gray-400 mt-1">{weather?.condition_text ?? 'Loading...'}</p>
                <p className="text-sm text-gray-500">
                  {t.feelsLike} {weather ? formatTemp(weather.feels_like_c) : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick access to chat */}
          <Link
            href="/chat"
            className="flex items-center gap-3 glass-card px-5 py-4 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <MessageSquare size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t.chat}</p>
              <p className="text-xs text-gray-500">{t.chatGrounded || 'Natural language weather Q&A'}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      {weather && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t.humidity}
            value={`${weather.humidity_pct}%`}
            icon={Droplets}
            sub="Relative humidity"
          />
          <StatCard
            label={t.wind}
            value={`${Math.round(weather.wind_speed_kmh)} km/h`}
            icon={Wind}
            sub={windDirectionLabel(weather.wind_direction_deg)}
          />
          <StatCard
            label={t.rainChance}
            value={`${weather.rain_probability_pct}%`}
            icon={Droplets}
            sub={`${weather.precipitation_mm}mm now`}
          />
          <StatCard
            label={t.feelsLike}
            value={formatTemp(weather.feels_like_c)}
            icon={Thermometer}
            sub="Apparent temp"
          />
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              {t.alerts} ({activeAlerts.length})
            </h2>
          </div>
          <div className="grid gap-3">
            {activeAlerts.slice(0, 3).map((alert) => {
              const colors = SEVERITY_COLORS[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`glass-card p-4 border ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{ALERT_TYPE_ICONS[alert.alert_type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-sm ${colors.text}`}>{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeAlerts.length > 3 && (
              <Link href="/alerts" className="text-sm text-blue-400 hover:text-blue-300 text-center block">
                View all {activeAlerts.length} alerts →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { href: '/forecast', emoji: '📅', label: t.forecast, desc: '7-day outlook' },
          { href: '/alerts', emoji: '🚨', label: t.alerts, desc: `${activeAlerts.length} active` },
          { href: '/shelters', emoji: '🛡️', label: t.shelters || 'Safe Shelters', desc: 'Emergency relief' },
          { href: '/advisory', emoji: '💡', label: t.advisory, desc: 'Personalized tips' },
          { href: '/history', emoji: '📊', label: t.history, desc: 'Past 30 days' },
        ].map(({ href, emoji, label, desc }) => (
          <Link key={href} href={href} className="glass-card glass-card-hover p-4 block">
            <span className="text-2xl block mb-2">{emoji}</span>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}