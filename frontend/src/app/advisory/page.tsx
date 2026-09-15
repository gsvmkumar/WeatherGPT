'use client';

import { useAdvisories } from '@/hooks/useWeather';
import { useAppStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { ADVISORY_CATEGORY_CONFIG } from '@/lib/utils';
import { RefreshCw, Sparkles, Sprout, ShieldCheck } from 'lucide-react';
import type { AdvisoryCategory } from '@/types';

export default function AdvisoryPage() {
  const location = useAppStore((s) => s.location);
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation(language);
  const { data, loading, error, refetch } = useAdvisories();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={28} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  // Group advisories by category
  const grouped: Record<AdvisoryCategory, string[]> = {
    agriculture: [],
    travel: [],
    outdoor: [],
    general: [],
  };

  data?.advisories.forEach((a) => {
    if (grouped[a.category as AdvisoryCategory]) {
      grouped[a.category as AdvisoryCategory].push(a.recommendation);
    }
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t.advisory}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={12} />
              Verified Rules
            </span>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-0.5">
            {location?.name} · Grounded in Open-Meteo observations
          </p>
        </div>
        <button
          onClick={refetch}
          aria-label="Refresh advisories"
          className="p-2.5 glass-card glass-card-hover rounded-xl text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-xs"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 border border-red-500/30 text-red-500 text-sm">{error}</div>
      )}

      {/* Gemini AI Natural Language Synthesis grounded in rules */}
      {data?.ai_explanation && (
        <div className="glass-card p-5 border border-purple-500/30 bg-purple-500/[0.04] relative overflow-hidden shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Sparkles size={16} />
            </div>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-purple-700 dark:text-purple-300">
              {language === 'te' ? 'AI వ్యవసాయ సలహా విశ్లేషణ' : 'Grounded AI Advisory Synthesis'}
            </h2>
          </div>
          <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
            {data.ai_explanation}
          </div>
        </div>
      )}

      {/* Deterministic Rule Category Cards */}
      <div className="grid gap-4">
        {(Object.entries(grouped) as [AdvisoryCategory, string[]][]).map(([category, recs]) => {
          if (recs.length === 0) return null;
          const cfg = ADVISORY_CATEGORY_CONFIG[category];
          return (
            <div key={category} className={`glass-card p-5 border ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{cfg.icon}</span>
                <h2 className={`font-semibold text-sm uppercase tracking-wider ${cfg.color}`}>
                  {category === 'agriculture' && language === 'te'
                    ? 'వ్యవసాయ సలహాలు'
                    : category === 'outdoor' && language === 'te'
                    ? 'బహిరంగ కార్యకలాపాలు'
                    : category === 'travel' && language === 'te'
                    ? 'ప్రయాణ సూచనలు'
                    : category === 'general' && language === 'te'
                    ? 'సాధారణ భద్రత'
                    : cfg.label}
                </h2>
              </div>
              <ul className="space-y-3">
                {recs.map((rec, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-800 dark:text-gray-200 leading-relaxed">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current ${cfg.color}`} />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
