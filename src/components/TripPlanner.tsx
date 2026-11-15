import React, { useState, useMemo } from 'react';
import {
  Compass,
  ArrowUpDown,
  Clock,
  ArrowRight,
  MapPin,
  Bus as BusIcon,
  ChevronRight,
  Navigation,
  CheckCircle2,
  Map,
  Repeat,
} from 'lucide-react';
import { Language, Route, Stop, TripPlanOption } from '../types/transit';
import { createTranslator } from '../i18n';
import { findTripOptions } from '../utils/transit';

interface TripPlannerProps {
  stops: Stop[];
  routes: Route[];
  initialFromStopId?: string | null;
  initialToStopId?: string | null;
  onViewPlanOnMap: (plan: TripPlanOption) => void;
  lang: Language;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({
  stops,
  routes,
  initialFromStopId,
  initialToStopId,
  onViewPlanOnMap,
  lang,
}) => {
  const [fromStopId, setFromStopId] = useState<string>(initialFromStopId || 's1');
  const [toStopId, setToStopId] = useState<string>(initialToStopId || 's8');

  const { t, tp, l } = createTranslator(lang);

  const handleSwap = () => {
    const temp = fromStopId;
    setFromStopId(toStopId);
    setToStopId(temp);
  };

  // Quick preset destinations
  const quickDestinations = [
    { id: 's4', label: t('planner.presets.cityHall') },
    { id: 's3', label: t('planner.presets.market') },
    { id: 's7', label: t('planner.presets.hospital') },
    { id: 's1', label: t('planner.presets.busStation') },
  ];

  // Calculate results using pure routing algorithm
  const tripOptions = useMemo(() => {
    return findTripOptions(fromStopId, toStopId, routes, stops);
  }, [fromStopId, toStopId, routes, stops]);

  const fromStop = stops.find((s) => s.id === fromStopId);
  const toStop = stops.find((s) => s.id === toStopId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 mb-3 shadow-2xs">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('planner.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('planner.subtitle')}
        </p>
      </div>

      {/* Origin / Destination Input Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* From Stop */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>{t('planner.from')}</span>
            </label>
            <select
              value={fromStopId}
              onChange={(e) => setFromStopId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
            >
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id} disabled={stop.id === toStopId}>
                  {l(stop.name)} {stop.address ? `(${l(stop.address)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center md:pt-6">
            <button
              onClick={handleSwap}
              className="p-3 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 transition-colors shadow-2xs"
              title={t('planner.swap')}
              aria-label={t('planner.swap')}
            >
              <ArrowUpDown className="w-5 h-5" />
            </button>
          </div>

          {/* To Stop */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>{t('planner.to')}</span>
            </label>
            <select
              value={toStopId}
              onChange={(e) => setToStopId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
            >
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id} disabled={stop.id === fromStopId}>
                  {l(stop.name)} {stop.address ? `(${l(stop.address)})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Destination Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-medium">{t('planner.quickSelect')}</span>
          {quickDestinations.map((dest) => (
            <button
              key={dest.id}
              onClick={() => setToStopId(dest.id)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                toStopId === dest.id
                  ? 'bg-sky-600 border-sky-600 text-white font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {dest.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {tripOptions.length > 0
              ? `${t('planner.foundOptionsLabel')} ${tp('options', tripOptions.length)}`
              : t('planner.noResults')}
          </h2>
          {fromStop && toStop && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {l(fromStop.name)} → {l(toStop.name)}
            </span>
          )}
        </div>

        {tripOptions.map((plan, idx) => {
          const isDirect = plan.type === 'direct';

          return (
            <div
              key={plan.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all shadow-xs ${
                idx === 0
                  ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/10 dark:ring-sky-400/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Plan Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      isDirect
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {isDirect ? t('planner.directRoute') : t('planner.transferRoute')}
                  </span>
                  {idx === 0 && (
                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-full">
                      {t('planner.fastestBadge')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold text-base">
                    <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>~{tp('minutesShort', plan.totalDurationMinutes)}</span>
                  </div>

                  <button
                    onClick={() => onViewPlanOnMap(plan)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>{t('planner.showStepsOnMap')}</span>
                  </button>
                </div>
              </div>

              {/* Step By Step Segments */}
              <div className="space-y-4">
                {plan.segments.map((segment, segIdx) => (
                  <div key={segIdx} className="relative pl-6">
                    {/* Line connector */}
                    {segIdx < plan.segments.length - 1 && (
                      <div className="absolute left-2.5 top-5 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 border-dashed" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* Boarding Point */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900"
                            style={{ borderColor: segment.route.color }}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {t('planner.boardAt')}: {l(segment.boardStop.name)}
                          </span>
                        </div>

                        {/* Route Taken */}
                        <div className="ml-5 my-1.5 flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 text-xs font-bold text-white rounded-md"
                            style={{ backgroundColor: segment.route.color }}
                          >
                            №{segment.route.number}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {tp('stops', segment.stopsCount)} · ~
                            {tp('minutesShort', segment.durationMinutes)}
                          </span>
                        </div>

                        {/* Alighting Point */}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: segment.route.color }}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {segIdx === plan.segments.length - 1
                              ? `${t('planner.alightAt')}: ${l(segment.alightStop.name)}`
                              : `${t('planner.transferAt')}: ${l(segment.alightStop.name)}`}
                          </span>
                        </div>
                      </div>

                      {/* Route fare tag */}
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                        {segment.route.fareKgs} {t('routes.som')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {tripOptions.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <Compass className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
            <p className="text-sm font-medium">{t('planner.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
