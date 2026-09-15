'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { getNearbyShelters } from '@/lib/api';
import type { ShelterItem, SheltersResponse } from '@/types';
import {
  Shield,
  MapPin,
  Phone,
  Navigation,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Users,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function SheltersPage() {
  const { location, language } = useAppStore();
  const { t } = useTranslation(language);

  const [data, setData] = useState<SheltersResponse | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<ShelterItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(35.0);

  const fetchShelters = async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNearbyShelters(
        location.latitude,
        location.longitude,
        radiusKm,
        language
      );
      setData(res);
      if (res.shelters.length > 0) {
        setSelectedShelter(res.shelters[0]);
      } else {
        setSelectedShelter(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to retrieve nearby safe emergency shelters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, [location?.latitude, location?.longitude, language, radiusKm]);

  // Handle opening directions in Google Maps
  const handleDirections = (shelter: ShelterItem) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-slide-up pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t.shelters || 'Emergency Safe Shelters'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official verified flood, cyclone, and disaster relief centres near {location?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Radius selector */}
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value={20}>Within 20 km</option>
            <option value={35}>Within 35 km</option>
            <option value={50}>Within 50 km</option>
            <option value={75}>Within 75 km</option>
          </select>

          <button
            onClick={fetchShelters}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh shelters"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Official Safety Advisory Banner */}
      {data?.safety_advisory && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <span className="font-bold">Official Safety Advisory: </span>
            {data.safety_advisory}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <RefreshCw size={32} className="text-blue-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Locating verified emergency safe shelters...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left: Interactive Shelter Map Visualizer ──────────────────────── */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="glass-card p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-blue-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Disaster Relief Shelter Map
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {data?.shelters?.length ?? 0} shelters mapped
                </span>
              </div>

              {/* Vector SVG Coordinate Map */}
              <div className="relative w-full h-80 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* Grid Overlay */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Radar sweep ring animation */}
                <div className="absolute w-56 h-56 rounded-full border border-blue-500/20 animate-ping opacity-25 pointer-events-none" />
                <div className="absolute w-72 h-72 rounded-full border border-blue-500/10 pointer-events-none" />

                {/* Center: User Current Location Pin */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-60"></span>
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <MapPin size={18} />
                    </div>
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-sm">
                    You ({location?.name})
                  </span>
                </div>

                {/* Surrounding Shelters Pins */}
                {data?.shelters?.map((shelter, idx) => {
                  const isSelected = selectedShelter?.id === shelter.id;
                  // Compute simple relative radial offset around the user for visual map placement
                  const angle = (idx / Math.max(data.shelters.length, 1)) * 2 * Math.PI - Math.PI / 2;
                  const normalizedDist = Math.min(Math.max((shelter.distance_km / radiusKm) * 110, 45), 130);
                  const x = Math.cos(angle) * normalizedDist;
                  const y = Math.sin(angle) * normalizedDist;

                  return (
                    <button
                      key={shelter.id}
                      onClick={() => setSelectedShelter(shelter)}
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                      className={`absolute z-20 flex flex-col items-center transition-all cursor-pointer ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110 opacity-90'
                      }`}
                      title={`${shelter.name} (${shelter.distance_km.toFixed(1)} km)`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 ${
                          isSelected
                            ? 'bg-emerald-500 text-white border-white ring-4 ring-emerald-500/40'
                            : 'bg-slate-800 text-emerald-400 border-emerald-500/50'
                        }`}
                      >
                        <Shield size={14} />
                      </div>
                      <span className="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-200 border border-slate-700 max-w-[80px] truncate shadow-xs">
                        {shelter.name.split(' ')[0]} ({shelter.distance_km.toFixed(0)}k)
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>Your GPS Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Verified Safe Shelter</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Radius: {radiusKm} km</span>
                </div>
              </div>
            </div>

            {/* Selected Shelter Spotlight Details */}
            {selectedShelter && (
              <div className="glass-card p-5 bg-white dark:bg-slate-900/70 border border-emerald-500/30 rounded-3xl shadow-sm animate-fade-in">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedShelter.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Verified Official
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin size={12} className="flex-shrink-0 text-blue-500" />
                      <span>{selectedShelter.address}</span>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedShelter.distance_km.toFixed(1)} km
                    </span>
                    <p className="text-[10px] text-slate-400">from your location</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Facility Type
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {selectedShelter.facility_type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Capacity
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Users size={12} />
                      {selectedShelter.capacity ? `${selectedShelter.capacity} people` : 'Designated Safe Zone'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Disaster Authority
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {selectedShelter.source}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleDirections(selectedShelter)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Navigation size={14} />
                    <span>Get Directions on Google Maps</span>
                    <ExternalLink size={12} className="opacity-80" />
                  </button>

                  {selectedShelter.contact_information && (
                    <a
                      href={`tel:${selectedShelter.contact_information.replace(/\D/g, '')}`}
                      className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Phone size={13} />
                      <span>{selectedShelter.contact_information}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: List of Shelters ──────────────────────────────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nearest Safe Centres ({data?.shelters?.length ?? 0})
              </h2>
              <span className="text-[11px] text-slate-400">Sorted by distance</span>
            </div>

            {data?.shelters?.length === 0 ? (
              <div className="p-8 text-center glass-card rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Shield size={36} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Shelters Found within {radiusKm} km
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Try expanding the search radius or contact the National Disaster Helpline at 1070 / 112.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {data?.shelters?.map((shelter) => {
                  const isSelected = selectedShelter?.id === shelter.id;
                  return (
                    <div
                      key={shelter.id}
                      onClick={() => setSelectedShelter(shelter)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-500/60 shadow-xs ring-1 ring-blue-500/40'
                          : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {shelter.name}
                            </h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Verified
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {shelter.address}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                          {shelter.distance_km.toFixed(1)} km
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                        <span className="capitalize">{shelter.facility_type.replace('_', ' ')}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirections(shelter);
                          }}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation size={11} />
                          Directions
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
