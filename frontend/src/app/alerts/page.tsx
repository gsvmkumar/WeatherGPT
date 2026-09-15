'use client';

import Link from 'next/link';
import { useAlerts } from '@/hooks/useWeather';
import { useAppStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { SEVERITY_COLORS, ALERT_TYPE_ICONS, formatTime } from '@/lib/utils';
import { RefreshCw, ShieldCheck, AlertTriangle, AlertOctagon, Info, Sparkles, MapPin, Clock, Shield } from 'lucide-react';

export default function AlertsPage() {
  const location = useAppStore((s) => s.location);
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation(language);
  const { data, loading, error, refetch } = useAlerts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={28} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  const alerts = data?.alerts ?? [];
  const active = alerts.filter((a) => a.is_active);

  const severeAlerts = active.filter((a) => a.severity === 'critical' || a.severity === 'high');
  const moderateAlerts = active.filter((a) => a.severity === 'medium' || a.severity === 'low');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t.alerts}
            </h1>
            {active.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                <AlertTriangle size={12} />
                {active.length} Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={12} />
                Normal
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-0.5">
            {location?.name} · Dynamic meteorological threshold calculation
          </p>
        </div>
        <button
          onClick={refetch}
          aria-label="Refresh alerts"
          className="p-2.5 glass-card glass-card-hover rounded-xl text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 border border-red-500/30 text-red-500 text-sm">{error}</div>
      )}

      {/* Emergency Shelters Banner for High/Severe Warnings */}
      {severeAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-red-600/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl flex-shrink-0">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                Emergency Safe Shelters Activated
              </h3>
              <p className="text-xs text-red-100 mt-0.5">
                Official cyclone, flood, and disaster shelters are listed near {location?.name}.
              </p>
            </div>
          </div>
          <Link
            href="/shelters"
            className="py-2.5 px-4 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 flex-shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Shield size={13} />
            <span>View Safe Shelters Map</span>
          </Link>
        </div>
      )}


      {/* Gemini AI Public Safety Briefing */}
      {data?.ai_explanation && (
        <div className="glass-card p-5 border border-blue-500/30 bg-blue-500/[0.04] relative overflow-hidden shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Sparkles size={16} />
            </div>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-blue-700 dark:text-blue-300">
              {language === 'te' ? 'AI ప్రజా భద్రతా సారాంశం' : 'AI Meteorological Safety Briefing'}
            </h2>
          </div>
          <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
            {data.ai_explanation}
          </div>
        </div>
      )}

      {/* State 1: No active alerts */}
      {!loading && active.length === 0 && (
        <div className="glass-card p-10 text-center border border-emerald-500/20 bg-emerald-500/[0.03]">
          <ShieldCheck size={52} className="text-emerald-500 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {language === 'te' ? 'అన్నీ సాధారణ స్థితిలో ఉన్నాయి' : 'All Clear — No Active Alerts'}
          </p>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1.5 max-w-md mx-auto">
            {language === 'te'
              ? `${location?.name}లో ప్రస్తుతం తీవ్రమైన వాతావరణ హెచ్చరికలు ఏవీ లేవు. అన్ని కొలతలు సాధారణ పరిమితుల్లో ఉన్నాయి.`
              : `Weather parameters in ${location?.name} are currently within safe thresholds with no severe weather warnings.`}
          </p>
        </div>
      )}

      {/* State 2: High / Severe Alerts */}
      {severeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-red-500" />
            <h2 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              {language === 'te' ? 'తీవ్రమైన హెచ్చరికలు' : 'High / Severe Warnings'} ({severeAlerts.length})
            </h2>
          </div>
          {severeAlerts.map((alert) => {
            const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.high;
            return (
              <div key={alert.id} className={`glass-card p-5 border ${colors.border} ${colors.bg} animate-slide-up shadow-sm`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{ALERT_TYPE_ICONS[alert.alert_type] || '⚠️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className={`font-bold text-base ${colors.text}`}>{alert.title}</h3>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${colors.badge}`}>
                        {alert.severity}
                      </span>
                      {alert.location && (
                        <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={11} />
                          {alert.location}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 dark:text-gray-200 leading-relaxed">{alert.description}</p>
                    {alert.reason && (
                      <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 font-medium">
                        <span className="font-semibold">Threshold Rule:</span> {alert.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-gray-400 flex-wrap">
                      <span>
                        Measured: <span className={`font-bold ${colors.text}`}>{alert.triggered_value.toFixed(1)}</span>
                      </span>
                      <span>Threshold: {alert.threshold_value.toFixed(1)}</span>
                      {alert.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Issued: {formatTime(alert.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* State 3: Low / Moderate Alerts */}
      {moderateAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-amber-500" />
            <h2 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {language === 'te' ? 'సాధారణ హెచ్చరికలు & సలహాలు' : 'Low / Moderate Advisories'} ({moderateAlerts.length})
            </h2>
          </div>
          {moderateAlerts.map((alert) => {
            const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
            return (
              <div key={alert.id} className={`glass-card p-5 border ${colors.border} ${colors.bg} animate-slide-up shadow-sm`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{ALERT_TYPE_ICONS[alert.alert_type] || 'ℹ️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className={`font-bold text-base ${colors.text}`}>{alert.title}</h3>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${colors.badge}`}>
                        {alert.severity}
                      </span>
                      {alert.location && (
                        <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={11} />
                          {alert.location}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 dark:text-gray-200 leading-relaxed">{alert.description}</p>
                    {alert.reason && (
                      <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 font-medium">
                        <span className="font-semibold">Reason:</span> {alert.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-gray-400 flex-wrap">
                      <span>
                        Measured: <span className={`font-bold ${colors.text}`}>{alert.triggered_value.toFixed(1)}</span>
                      </span>
                      <span>Threshold: {alert.threshold_value.toFixed(1)}</span>
                      {alert.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Issued: {formatTime(alert.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
