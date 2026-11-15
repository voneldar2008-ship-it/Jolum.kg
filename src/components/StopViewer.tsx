import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Bus as BusIcon,
  Clock,
  Compass,
  Map,
  Wifi,
  Wind,
  Accessibility,
  Eye,
} from 'lucide-react';
import { Bus, Language, Route, Stop } from '../types/transit';
import { createTranslator } from '../i18n';
import { calculateETAForStop, findNearestStops } from '../utils/transit';
import { MANAS_CENTER } from '../data/initialData';

interface StopViewerProps {
  stops: Stop[];
  routes: Route[];
  buses: Bus[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  onViewOnMap: (stopId: string) => void;
  onPlanTrip: (stopId: string, as: 'from' | 'to') => void;
  lang: Language;
}

export const StopViewer: React.FC<StopViewerProps> = ({
  stops,
  routes,
  buses,
  selectedStopId,
  onSelectStop,
  onViewOnMap,
  onPlanTrip,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNearestOnly, setShowNearestOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>(MANAS_CENTER);

  const { t, tp, l } = createTranslator(lang);

  // Filter stops across all supported languages
  const filteredStops = stops.filter((stop) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      stop.name.ru.toLowerCase().includes(q) ||
      stop.name.kg.toLowerCase().includes(q) ||
      Boolean(stop.name.en && stop.name.en.toLowerCase().includes(q)) ||
      stop.address?.ru.toLowerCase().includes(q) ||
      stop.address?.kg.toLowerCase().includes(q) ||
      Boolean(stop.address?.en && stop.address.en.toLowerCase().includes(q))
    );
  });

  const displayStops = showNearestOnly
    ? findNearestStops(userLocation[0], userLocation[1], filteredStops, 6).map((item) => item.stop)
    : filteredStops;

  const activeStop =
    stops.find((s) => s.id === selectedStopId) || displayStops[0] || stops[0];

  // Incoming buses for active stop
  const incomingBuses = activeStop
    ? buses
        .filter((b) => activeStop.routes.includes(b.routeId))
        .map((b) => {
          const r = routes.find((rt) => rt.id === b.routeId);
          const eta = r ? calculateETAForStop(b, activeStop.id, r, stops) : null;
          return { bus: b, route: r, eta };
        })
        .filter((item) => item.eta !== null)
        .sort((a, b) => (a.eta || 0) - (b.eta || 0))
    : [];

  const handleGetNearest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setShowNearestOnly(true);
        },
        () => {
          // fallback to center
          setUserLocation(MANAS_CENTER);
          setShowNearestOnly(true);
        }
      );
    } else {
      setShowNearestOnly(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('stops.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('stops.subtitlePrefix')} {tp('stops', displayStops.length)} · {t('cityBadge')}
          </p>
        </div>

        {/* Search & Proximity Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('stops.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs"
            />
          </div>

          <button
            onClick={() => {
              if (showNearestOnly) setShowNearestOnly(false);
              else handleGetNearest();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors shadow-2xs ${
              showNearestOnly
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{t('stops.nearestToMe')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Stops List + Selected Stop Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Stops */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
          {displayStops.map((stop) => {
            const isSelected = activeStop?.id === stop.id;
            return (
              <div
                key={stop.id}
                onClick={() => onSelectStop(stop.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/15 dark:ring-sky-400/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {l(stop.name)}
                      </h3>
                      {stop.address && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{l(stop.address)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Passing routes badges */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {t('stops.routesShort')}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {stop.routes.map((rid) => {
                      const r = routes.find((rt) => rt.id === rid);
                      if (!r) return null;
                      return (
                        <span
                          key={r.id}
                          className="px-2 py-0.2 text-[10px] font-bold text-white rounded"
                          style={{ backgroundColor: r.color }}
                        >
                          №{r.number}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Stop Detail Card */}
        {activeStop && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm sticky top-24">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('stops.stopKind')}</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {l(activeStop.name)}
                </h2>
                {activeStop.address && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{l(activeStop.address)}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewOnMap(activeStop.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>{t('routes.viewOnMap')}</span>
                </button>
              </div>
            </div>

            {/* Passing routes cards */}
            <div className="my-5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                {t('stops.passingRoutes')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeStop.routes.map((rid) => {
                  const r = routes.find((rt) => rt.id === rid);
                  if (!r) return null;
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="px-2.5 py-1 text-xs font-extrabold text-white rounded-lg shadow-2xs"
                          style={{ backgroundColor: r.color }}
                        >
                          №{r.number}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {l(r.name)}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {tp('minutesShort', r.frequencyMinutes)} · {r.fareKgs} {t('routes.som')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time Arrival Board */}
            <div className="my-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('stops.arrivalBoard')}
                </span>
                <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400">
                  {t('demoNotice')}
                </span>
              </div>

              {incomingBuses.length > 0 ? (
                <div className="space-y-2">
                  {incomingBuses.map(({ bus, route, eta }) => (
                    <div
                      key={bus.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-2xs hover:border-sky-300 dark:hover:border-sky-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="px-3 py-1 text-sm font-extrabold text-white rounded-lg"
                          style={{ backgroundColor: route?.color || '#0284c7' }}
                        >
                          №{route?.number}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {bus.plateNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              ({bus.model})
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              bus.occupancy === 'low'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : bus.occupancy === 'medium'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t('busCard.occupancy.label')}{' '}
                            {bus.occupancy === 'low'
                              ? t('busCard.occupancy.low')
                              : bus.occupancy === 'medium'
                              ? t('busCard.occupancy.medium')
                              : t('busCard.occupancy.high')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 px-2.5 py-1 rounded-full inline-block">
                          ~{tp('minutesShort', eta ?? 1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                  {t('stops.noUpcomingBuses')}
                </div>
              )}
            </div>

            {/* Stop Amenities */}
            {activeStop.amenities && activeStop.amenities.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  {t('stops.amenitiesTitle')}
                </span>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                  {activeStop.amenities.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium flex items-center gap-1.5"
                    >
                      {item === 'wifi' && <Wifi className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                      {item === 'accessible' && (
                        <Accessibility className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span>{t(`stops.amenities.${item}`)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Trip Planner Action */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onPlanTrip(activeStop.id, 'from')}
                className="py-2 px-3 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-xl transition-colors text-center"
              >
                {t('stops.planFromHere')}
              </button>
              <button
                onClick={() => onPlanTrip(activeStop.id, 'to')}
                className="py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-center"
              >
                {t('stops.planToHere')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
